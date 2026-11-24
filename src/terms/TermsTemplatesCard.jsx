import { useEffect, useRef, useState } from 'react';
import MarkdownEditor from './MarkdownEditor.jsx';
import { buildStandardTermsMarkdown } from './standardTemplate.js';
import { ACCEPTED_TERMS_FILES, MAX_UPLOAD_BYTES, fileKind, importTermsFile, pdfPageCount } from './importers.js';
import { DEFAULT_TERMS_TITLE, listTemplates, saveTemplate, deleteTemplate, setDefaultTemplate } from './model.js';
import { db } from '../data/index.js';
import { getSettings, resolveData, TERMS_KEYS, pick } from '../settings.js';

const blankDraft = () => ({ name: '', format: 'markdown', title: DEFAULT_TERMS_TITLE, body: '', isDefault: false });

// Standard T&C filled with your Settings values (no client-specific details).
const standardFromSettings = () => {
  const st = getSettings();
  return buildStandardTermsMarkdown(resolveData({ ...pick(st, TERMS_KEYS), currency: st.currency, phases: [] }));
};

export default function TermsTemplatesCard() {
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState(null); // template being created/edited
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ text: '', error: false });
  const importRef = useRef(null);
  const pdfRef = useRef(null);

  const refresh = () => listTemplates().then(setList).catch(() => {});
  useEffect(() => {
    refresh();
    window.addEventListener('terms-templates-changed', refresh);
    return () => window.removeEventListener('terms-templates-changed', refresh);
  }, []);

  const say = (text, error = false) => setMsg({ text, error });

  async function save() {
    if (!draft.name.trim()) { say('Give the template a name.', true); return; }
    if (draft.format === 'markdown' && !draft.body.trim()) { say('The template text is empty.', true); return; }
    if (draft.format === 'pdf' && !draft.file?.id) { say('Upload a PDF for this template.', true); return; }
    try {
      await saveTemplate({ ...draft, name: draft.name.trim() });
      setDraft(null);
      say('Template saved.');
    } catch (err) {
      say(err.message || String(err), true);
    }
  }

  async function onImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!fileKind(file)) { say('Please choose a .txt, .md, .doc, .docx or .pdf file.', true); return; }
    if (draft.body.trim() && !confirm('Replace the text currently in the editor?')) return;
    setBusy(`Reading ${file.name}…`);
    try {
      const md = await importTermsFile(file);
      if (!md.trim()) throw new Error('No text was found in that file.');
      setDraft((d) => ({ ...d, body: md, name: d.name || file.name.replace(/\.[^.]+$/, '') }));
      say(`Imported ${file.name}. Check and edit below.`);
    } catch (err) {
      say(err.message || String(err), true);
    } finally {
      setBusy('');
    }
  }

  async function onPdf(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (fileKind(file) !== 'pdf') { say('Please choose a PDF file.', true); return; }
    if (file.size > MAX_UPLOAD_BYTES) { say('That file is larger than 15 MB.', true); return; }
    setBusy(`Uploading ${file.name}…`);
    try {
      const pages = await pdfPageCount(file);
      const info = await db.files.put(file, { name: file.name, type: 'application/pdf' });
      setDraft((d) => ({ ...d, format: 'pdf', file: { ...info, pages }, name: d.name || file.name.replace(/\.[^.]+$/, '') }));
    } catch (err) {
      say(`Could not upload this PDF: ${err.message || err}`, true);
    } finally {
      setBusy('');
    }
  }

  async function remove(t) {
    if (!confirm(`Delete template “${t.name}”? Invoices already using its text keep their copy.`)) return;
    await deleteTemplate(t.id);
    if (draft?.id === t.id) setDraft(null);
  }

  return (
    <section className="group settings-card">
      <h3>Terms &amp; Conditions templates</h3>
      <p className="hint card-note">
        Reusable T&amp;C for your invoices. The built-in standard T&amp;C is always available; start from it, write your own,
        or upload a .txt, .md, .doc, .docx or .pdf. The default template is applied to new invoices.
      </p>

      {msg.text && <div className={msg.error ? 'error-box' : 'notice'}>{msg.text}</div>}
      {busy && <div className="notice">{busy}</div>}

      <ul className="tpl-list">
        <li className="tpl-row">
          <label className="tpl-default" title="Use the built-in standard T&C for new invoices">
            <input type="radio" name="defaultTpl" checked={!list.some((t) => t.isDefault)} onChange={() => setDefaultTemplate(null)} />
          </label>
          <div className="tpl-info">
            <strong>Standard T&amp;C (built-in)</strong>
            <span className="hint">Filled from each invoice’s scope, revisions, timeline and payment values</span>
          </div>
          <div className="tpl-actions">
            <button type="button" className="ghost sm" onClick={() => setDraft({ ...blankDraft(), name: 'My standard T&C', body: standardFromSettings() })}>
              Copy &amp; edit
            </button>
          </div>
        </li>
        {list.map((t) => (
          <li key={t.id} className="tpl-row">
            <label className="tpl-default" title="Apply to new invoices">
              <input type="radio" name="defaultTpl" checked={!!t.isDefault} onChange={() => setDefaultTemplate(t.id)} />
            </label>
            <div className="tpl-info">
              <strong>{t.name}</strong>
              <span className="hint">
                {t.format === 'pdf' ? `PDF · ${t.file?.name || ''}` : `Text · ${(t.body || '').trim().split(/\s+/).filter(Boolean).length} words`}
                {' · '}updated {new Date(t.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="tpl-actions">
              <button type="button" className="ghost sm" onClick={() => setDraft({ ...t })}>Edit</button>
              <button type="button" className="ghost sm danger" onClick={() => remove(t)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <p className="hint">The selected circle is the default for new invoices.</p>

      {!draft && (
        <div className="terms-actions">
          <button type="button" className="primary sm" onClick={() => setDraft(blankDraft())}>+ New text template</button>
          <button type="button" className="ghost sm" onClick={() => setDraft({ ...blankDraft(), format: 'pdf' })}>+ New PDF template</button>
        </div>
      )}

      {draft && (
        <div className="tpl-editor">
          <div className="grid">
            <label className="field">
              <span className="label">Template name</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Website projects T&C" autoFocus />
            </label>
            {draft.format === 'markdown' && (
              <label className="field">
                <span className="label">Heading on the PDF</span>
                <input value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={DEFAULT_TERMS_TITLE} />
              </label>
            )}
          </div>

          {draft.format === 'markdown' ? (
            <>
              <div className="terms-actions">
                <button type="button" className="ghost sm" onClick={() => (!draft.body.trim() || confirm('Replace the text currently in the editor?')) && setDraft({ ...draft, body: standardFromSettings() })}>
                  Start from standard template
                </button>
                <button type="button" className="ghost sm" onClick={() => importRef.current?.click()}>Upload file to edit</button>
                <input ref={importRef} type="file" accept={ACCEPTED_TERMS_FILES} hidden onChange={onImport} />
              </div>
              <MarkdownEditor value={draft.body} onChange={(v) => setDraft((d) => ({ ...d, body: v }))} placeholder="Type or paste your terms…" />
            </>
          ) : (
            <div className="terms-pdf">
              {draft.file?.id ? (
                <div className="file-card">
                  <div>
                    <strong>{draft.file.name}</strong>
                    <span className="hint">{draft.file.pages ? `${draft.file.pages} page${draft.file.pages === 1 ? '' : 's'}` : ''}</span>
                  </div>
                  <button type="button" className="ghost sm" onClick={() => pdfRef.current?.click()}>Replace</button>
                </div>
              ) : (
                <button type="button" className="dropzone" onClick={() => pdfRef.current?.click()}>
                  <strong>Upload T&amp;C PDF</strong>
                  <span className="hint">Attached unchanged before the invoice. Up to 15 MB.</span>
                </button>
              )}
              <input ref={pdfRef} type="file" accept=".pdf,application/pdf" hidden onChange={onPdf} />
            </div>
          )}

          <label className="check inline-check">
            <input type="checkbox" checked={!!draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
            <span>Use for new invoices (default)</span>
          </label>
          <div className="terms-actions end">
            <button type="button" className="ghost" onClick={() => setDraft(null)}>Cancel</button>
            <button type="button" className="primary" onClick={save}>Save template</button>
          </div>
        </div>
      )}
    </section>
  );
}
