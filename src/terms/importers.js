// Turns an uploaded T&C file into editable Markdown.
// Heavy libraries are loaded only when that file type is uploaded.

export const ACCEPTED_TERMS_FILES = '.txt,.md,.markdown,.doc,.docx,.pdf,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const fileKind = (file) => {
  const name = (file?.name || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  if (['md', 'markdown'].includes(ext) || file?.type === 'text/markdown') return 'md';
  if (ext === 'txt' || file?.type === 'text/plain') return 'txt';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  if (ext === 'pdf' || file?.type === 'application/pdf') return 'pdf';
  return null;
};

const tidy = (md) => md.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

// Plain text → Markdown: keeps paragraphs, turns "•", "-", "*" and "1." lines into lists,
// and escapes characters that would otherwise be read as Markdown by accident.
// Each line is treated as its own paragraph (one line per paragraph is how .txt, .doc
// and extracted PDF text arrive); consecutive list lines stay together as one list.
export function textToMarkdown(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let prevList = false;
  for (const line of lines) {
    const t = line.replace(/[\uE000-\uF8FF]/g, '•').trim(); // private-use glyphs = Symbol-font bullets
    if (!t) { out.push(''); prevList = false; continue; }
    if (t.startsWith('## ')) { out.push('', t, ''); prevList = false; continue; }
    const bullet = t.match(/^[•●▪◦‣\-*–]\s*(.+)$/);
    const num = t.match(/^(\d{1,3})[.)]\s+(.*)$/);
    const isList = Boolean(bullet || (num && num[2].length > 0 && !/^[A-Z][^.]{0,50}$/.test(num[2])));
    if (isList && !prevList) out.push('');
    if (!isList && out.length) out.push('');
    if (bullet) out.push(`- ${bullet[1]}`);
    else if (isList) out.push(`${num[1]}. ${num[2]}`);
    else if (num) out.push(`**${num[1]}. ${num[2]}**`); // short "1. Title" lines are numbered headings
    else out.push(t.replace(/^#/, '\\#'));
    prevList = isList;
  }
  return tidy(out.join('\n'));
}

async function htmlToMarkdown(html) {
  const { default: TurndownService } = await import('turndown');
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' });
  td.remove(['style', 'script', 'img']);
  return tidy(td.turndown(html).replace(/^(#{1,6} \d+)\\\./gm, '$1.'));
}

async function docxToMarkdown(file) {
  const mammoth = await import('mammoth/mammoth.browser.js');
  const lib = mammoth.default || mammoth;
  const { value } = await lib.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return htmlToMarkdown(value);
}

// Legacy Word 97–2003 (.doc): read the text through the document's piece table.
async function docToMarkdown(file) {
  const CFB = await import('cfb');
  const lib = CFB.default || CFB;
  const cfb = lib.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
  const wordEntry = lib.find(cfb, 'WordDocument');
  if (!wordEntry) throw new Error('This .doc file could not be read. Save it as .docx or PDF and try again.');
  const word = Uint8Array.from(wordEntry.content);
  const dv = new DataView(word.buffer);
  const flags = dv.getUint16(0x0a, true);
  const table = lib.find(cfb, flags & 0x0200 ? '1Table' : '0Table');
  if (!table) throw new Error('This .doc file could not be read. Save it as .docx or PDF and try again.');
  const tb = Uint8Array.from(table.content);
  const tv = new DataView(tb.buffer);
  const fcClx = dv.getUint32(0x01a2, true);
  const lcbClx = dv.getUint32(0x01a6, true);

  let pos = fcClx;
  const end = fcClx + lcbClx;
  while (pos < end && tb[pos] === 0x01) pos += 3 + tv.getUint16(pos + 1, true); // skip Prc
  if (tb[pos] !== 0x02) throw new Error('Unsupported .doc format. Save it as .docx or PDF and try again.');
  const lcb = tv.getUint32(pos + 1, true);
  const plc = pos + 5;
  const nPieces = (lcb - 4) / 12;

  let text = '';
  for (let i = 0; i < nPieces; i++) {
    const cpStart = tv.getUint32(plc + i * 4, true);
    const cpEnd = tv.getUint32(plc + (i + 1) * 4, true);
    const pcd = plc + (nPieces + 1) * 4 + i * 8;
    const fcRaw = tv.getUint32(pcd + 2, true);
    const compressed = (fcRaw & 0x40000000) !== 0;
    const fc = fcRaw & 0x3fffffff;
    const len = cpEnd - cpStart;
    if (compressed) {
      const start = fc / 2;
      text += new TextDecoder('windows-1252').decode(word.subarray(start, start + len));
    } else {
      text += new TextDecoder('utf-16le').decode(word.subarray(fc, fc + len * 2));
    }
  }

  // Drop field codes (0x13 code 0x14 result 0x15 → keep result), map Word control characters
  /* eslint-disable no-control-regex -- Word's binary format uses control characters as markers */
  text = text
    .replace(/\x13[^\x13\x14\x15]*\x14([^\x15]*)\x15/g, '$1')
    .replace(/\x13[^\x15]*\x15/g, '')
    .replace(/\x07/g, '\t')
    .replace(/[\x0b\x0c\x0d]/g, '\n')
    .replace(/[\x00-\x08\x0e-\x1f]/g, '');
  /* eslint-enable no-control-regex */
  return textToMarkdown(text);
}

let pdfjsPromise;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

// PDF → text, rebuilt into lines and paragraphs from the text positions.
export async function pdfToMarkdown(file) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const paras = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    const lines = [];
    let cur = null;
    let lastY = null;
    for (const it of items) {
      if (!('str' in it)) continue;
      const y = it.transform[5];
      const h = Math.round(it.height || Math.abs(it.transform[3]) || 0);
      if (cur && lastY !== null && Math.abs(y - lastY) > 1) {
        lines.push(cur);
        cur = null;
      }
      if (!cur) cur = { text: '', y, h: 0, gapBefore: lastY === null ? 0 : Math.abs(lastY - y) };
      cur.text += it.str;
      cur.h = Math.max(cur.h, h);
      lastY = y;
    }
    if (cur) lines.push(cur);

    const body = lines.filter((l) => l.text.trim()).map((l) => l.h).sort((a, b) => a - b);
    const bodyH = body[Math.floor(body.length / 2)] || 10;

    let para = '';
    let paraH = 0;
    let prevGap = bodyH * 1.6;
    const flush = () => { if (para) paras.push(paraH >= bodyH * 1.2 && para.length < 90 ? `## ${para}` : para); para = ''; };
    for (const l of lines) {
      const text = l.text.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const startsList = /^([•●▪◦\-*–\uE000-\uF8FF]|\d{1,3}[.)])\s?/.test(text);
      const newPara = !para || startsList || Math.abs(l.h - paraH) > 1 || l.gapBefore > Math.max(prevGap * 1.35, l.h * 1.9);
      if (newPara) flush();
      if (!newPara) prevGap = l.gapBefore;
      para = para ? `${para} ${text}` : text;
      paraH = l.h;
    }
    flush();
  }
  return textToMarkdown(paras.join('\n'));
}

// Counts PDF pages (used to show "n pages attached").
export async function pdfPageCount(file) {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  return pdf.getPageCount();
}

/** Uploaded file → Markdown for the editor. */
export async function importTermsFile(file) {
  const kind = fileKind(file);
  if (!kind) throw new Error('Please upload a .txt, .md, .doc, .docx or .pdf file.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That file is larger than 15 MB.');
  switch (kind) {
    case 'md': return tidy(await file.text());
    case 'txt': return textToMarkdown(await file.text());
    case 'docx': return docxToMarkdown(file);
    case 'doc': return docToMarkdown(file);
    case 'pdf': return pdfToMarkdown(file);
    default: throw new Error('Unsupported file.');
  }
}
