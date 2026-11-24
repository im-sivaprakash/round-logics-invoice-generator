import { useEffect, useRef, useState } from 'react';
import MarkdownEditor from './MarkdownEditor.jsx';
import { buildStandardTermsMarkdown } from './standardTemplate.js';
import { ACCEPTED_TERMS_FILES, MAX_UPLOAD_BYTES, fileKind, importTermsFile, pdfToMarkdown, pdfPageCount } from './importers.js';
import {
  TERMS_MODES, DEFAULT_TERMS_TITLE, termsModeOf, applyTemplate, listTemplates, saveTemplate,
} from './model.js';
import { db } from '../data/index.js';
import { resolveData } from '../settings.js';

const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function useTemplates() {
  const [list, setList] = useState([]);
  useEffect(() => {
    let alive = true;
    const refresh = () => listTemplates().then((l) => alive && setList(l)).catch(() => {});
    refresh();
    window.addEventListener('terms-templates-changed', refresh);
    return () => { alive = false; window.removeEventListener('terms-templates-changed', refresh); };
  }, []);
  return list;
}

export default function TermsPanel({ data, setData }) {
  const templates = useTemplates();
  const mode = data.termsMode || 'standard';
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ text: '', error: false });
  const [fileCheck, setFileCheck] = useState({ id: null, ok: true });
  const uploadRef = useRef(null);
  const pdfRef = useRef(null);

  const say = (text, error = false) => setMsg({ text, error });
  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  // Check the attached PDF still exists in this browser
  const fileId = mode === 'pdf' ? data.termsFile?.id : null;
  useEffect(() => {
    if (!fileId) return undefined;
    let alive = true;
    db.files.get(fileId)
      .then((f) => alive && setFileCheck({ id: fileId, ok: !!f }))
      .catch(() => alive && setFileCheck({ id: fileId, ok: false }));
    return () => { alive = false; };
  }, [fileId]);
  const fileOk = !fileId || fileCheck.id !== fileId || fileCheck.ok;

  const hasBody = (data.termsBody || '').trim().length > 0;
  const confirmReplace = () => !hasBody || confirm('Replace the text currently in the editor?');

  function startFromStandard() {
    if (!confirmReplace()) return;
    set({
      termsMode: 'custom',
      termsTitle: data.termsTitle || DEFAULT_TERMS_TITLE,
      termsBody: buildStandardTermsMarkdown(resolveData(data)),
      termsTemplateId: '',
    });
    say('Standard T&C copied into the editor — edit anything you like.');
  }

  async function onUploadText(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!fileKind(file)) { say('Please choose a .txt, .md, .doc, .docx or .pdf file.', true); return; }
    if (!confirmReplace()) return;
    setBusy(`Reading ${file.name}…`);
    try {
      const md = await importTermsFile(file);
      if (!md.trim()) throw new Error('No text was found in that file. If it is a scanned PDF, use “Attach my PDF as-is”.');
      set({ termsMode: 'custom', termsBody: md, termsTitle: data.termsTitle || DEFAULT_TERMS_TITLE, termsTemplateId: '' });
      say(`Imported ${file.name}. Check the formatting below and edit as needed.`);
    } catch (err) {
      say(err.message || String(err), true);
    } finally {
      setBusy('');
    }
  }

  async function onUploadPdf(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (fileKind(file) !== 'pdf') { say('Please choose a PDF file.', true); return; }
    if (file.size > MAX_UPLOAD_BYTES) { say('That file is larger than 15 MB.', true); return; }
    setBusy(`Attaching ${file.name}…`);
    try {
      const pages = await pdfPageCount(file);
      const info = await db.files.put(file, { name: file.name, type: 'application/pdf' });
      set({ termsMode: 'pdf', termsFile: { ...info, pages }, termsTemplateId: '' });
      say(`${file.name} attached (${pages} page${pages === 1 ? '' : 's'}).`);
    } catch (err) {
      say(`Could not attach this PDF: ${err.message || err}`, true);
    } finally {
      setBusy('');
    }
  }

  async function convertPdfToText() {
    if (!data.termsFile?.id) return;
    if (!confirmReplace()) return;
    setBusy('Extracting text from the PDF…');
    try {
      const f = await db.files.get(data.termsFile.id);
      if (!f) throw new Error('The attached PDF is no longer stored in this browser.');
      const md = await pdfToMarkdown(new File([f.blob], f.meta.name, { type: 'application/pdf' }));
      if (!md.trim()) throw new Error('No text found — the PDF may be scanned images. Keep it attached as-is instead.');
      set({ termsMode: 'custom', termsBody: md, termsTitle: data.termsTitle || DEFAULT_TERMS_TITLE });
      say('Text extracted. The PDF stays saved; switch back to “Attach my PDF” any time.');
    } catch (err) {
      say(err.message || String(err), true);
    } finally {
      setBusy('');
    }
  }

  async function loadTemplate(id) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    if (tpl.format !== 'pdf' && !confirmReplace()) return;
    setData((d) => applyTemplate(d, tpl));
    say(`Loaded template “${tpl.name}”.`);
  }

  async function saveAsTemplate() {
    const name = prompt('Template name', data.termsTitle && data.termsTitle !== DEFAULT_TERMS_TITLE ? data.termsTitle : 'My T&C');
    if (!name?.trim()) return;
    try {
      const tpl = mode === 'pdf'
        ? { name: name.trim(), format: 'pdf', file: data.termsFile }
        : { name: name.trim(), format: 'markdown', title: data.termsTitle || DEFAULT_TERMS_TITLE, body: data.termsBody || '' };
      const saved = await saveTemplate(tpl);
      set({ termsTemplateId: saved.id });
      say(`Saved as template “${saved.name}”. Manage templates in Settings.`);
    } catch (err) {
      say(err.message || String(err), true);
    }
  }

  const canSave = (mode === 'custom' && hasBody) || (mode === 'pdf' && data.termsFile?.id);
  const effective = termsModeOf(data);

  return (
    <div className="terms-panel wide">
      <div className="terms-modes" role="radiogroup" aria-label="Terms & Conditions source">
        {TERMS_MODES.map((m) => (
          <label key={m.value} className={`terms-mode${mode === m.value ? ' active' : ''}`}>
            <input type="radio" name="termsMode" value={m.value} checked={mode === m.value} onChange={() => set({ termsMode: m.value })} />
            <span className="terms-mode-label">{m.label}</span>
            <span className="hint">{m.hint}</span>
          </label>
        ))}
      </div>

      <div className="terms-bar">
        <select value="" onChange={(e) => loadTemplate(e.target.value)} aria-label="Load a saved template" disabled={!templates.length}>
          <option value="">{templates.length ? 'Load a saved template…' : 'No saved templates yet'}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}{t.format === 'pdf' ? ' (PDF)' : ''}{t.isDefault ? ' — default' : ''}</option>
          ))}
        </select>
        <button type="button" className="ghost sm" onClick={saveAsTemplate} disabled={!canSave}>Save as template</button>
      </div>

      {busy && <div className="notice">{busy}</div>}
      {msg.text && !busy && <div className={msg.error ? 'error-box' : 'notice'}>{msg.text}</div>}

      {mode === 'standard' && (
        <div className="terms-standard">
          <p>The PDF uses the standard Round Logics T&amp;C, filled in automatically from this invoice (scope, revisions, timeline, payment and renewal terms set below).</p>
          <button type="button" className="primary sm" onClick={startFromStandard}>Customise this T&amp;C</button>
          <span className="hint"> Copies the standard text into the editor so you can change anything.</span>
        </div>
      )}

      {mode === 'custom' && (
        <>
          <div className="terms-actions">
            <button type="button" className="ghost sm" onClick={startFromStandard}>Start from standard template</button>
            <button type="button" className="ghost sm" onClick={() => uploadRef.current?.click()}>Upload file to edit (.txt .md .doc .docx .pdf)</button>
            <input ref={uploadRef} type="file" accept={ACCEPTED_TERMS_FILES} hidden onChange={onUploadText} />
            {hasBody && (
              <button type="button" className="ghost sm danger" onClick={() => confirm('Clear the editor?') && set({ termsBody: '' })}>Clear</button>
            )}
          </div>
          <label className="field">
            <span className="label">Heading</span>
            <input value={data.termsTitle ?? DEFAULT_TERMS_TITLE} onChange={(e) => set({ termsTitle: e.target.value })} placeholder={DEFAULT_TERMS_TITLE} />
          </label>
          <MarkdownEditor
            value={data.termsBody || ''}
            onChange={(v) => set({ termsBody: v })}
            placeholder={'Type your terms here, or use “Start from standard template” / “Upload file”.\n\n## 1. Scope\nWhat is included…\n\n## 2. Payment\n- 50% advance\n- 50% on delivery'}
          />
          <label className="check inline-check">
            <input type="checkbox" checked={data.termsSignature !== false} onChange={(e) => set({ termsSignature: e.target.checked })} />
            <span>Add signature block at the end</span>
          </label>
          {effective === 'standard' && <p className="hint">The editor is empty, so the PDF uses the standard T&amp;C until you add text.</p>}
        </>
      )}

      {mode === 'pdf' && (
        <div className="terms-pdf">
          {data.termsFile?.id ? (
            <div className={`file-card${fileOk ? '' : ' missing'}`}>
              <div>
                <strong>{data.termsFile.name}</strong>
                <span className="hint">
                  {fileOk
                    ? [data.termsFile.pages && `${data.termsFile.pages} page${data.termsFile.pages === 1 ? '' : 's'}`, data.termsFile.size && kb(data.termsFile.size), 'placed before the invoice'].filter(Boolean).join(' · ')
                    : 'This file isn’t stored in this browser (e.g. invoice imported from a backup). Upload it again.'}
                </span>
              </div>
              <div className="terms-actions">
                <button type="button" className="ghost sm" onClick={() => pdfRef.current?.click()}>Replace</button>
                {fileOk && <button type="button" className="ghost sm" onClick={convertPdfToText}>Convert to editable text</button>}
                <button type="button" className="ghost sm danger" onClick={() => set({ termsFile: null })}>Remove</button>
              </div>
            </div>
          ) : (
            <button type="button" className="dropzone" onClick={() => pdfRef.current?.click()}>
              <strong>Upload your T&amp;C PDF</strong>
              <span className="hint">Its pages go into the final PDF unchanged, before the invoice. Up to 15 MB.</span>
            </button>
          )}
          <input ref={pdfRef} type="file" accept=".pdf,application/pdf" hidden onChange={onUploadPdf} />
          <p className="hint">Have a .doc, .docx, .txt or .md file? Choose “Write / edit my own” and upload it there.</p>
          {effective === 'standard' && <p className="hint">No PDF attached yet, so the PDF uses the standard T&amp;C.</p>}
        </div>
      )}
    </div>
  );
}
