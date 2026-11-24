// T&C options stored on each invoice (all optional — invoices without them use the
// built-in standard T&C exactly as before):
//
//   termsMode:        'standard' | 'custom' | 'pdf'
//   termsTitle:       heading for custom terms (default "Terms & Conditions")
//   termsBody:        Markdown text when termsMode === 'custom'
//   termsFile:        { id, name, size, type } when termsMode === 'pdf' (file lives in db.files)
//   termsSignature:   show the signature block after custom terms (default true)
//   termsTemplateId:  the saved template it came from (informational)
//
// Saved templates (db.termsTemplates):
//   { id, name, format: 'markdown' | 'pdf', title, body, file, isDefault, createdAt, updatedAt }

import { db } from '../data/index.js';
import { DEFAULT_TERMS_TITLE } from './constants.js';

export { TERMS_MODES, DEFAULT_TERMS_TITLE, termsModeOf } from './constants.js';

// Applies a saved template to invoice data (returns new data).
export function applyTemplate(data, tpl) {
  if (!tpl) return data;
  if (tpl.format === 'pdf') {
    return { ...data, termsMode: 'pdf', termsFile: tpl.file || null, termsTemplateId: tpl.id };
  }
  return {
    ...data,
    termsMode: 'custom',
    termsBody: tpl.body || '',
    termsTitle: tpl.title || DEFAULT_TERMS_TITLE,
    termsTemplateId: tpl.id,
  };
}

// ---- template repository helpers (async: ready for a database adapter) ----

export const listTemplates = () => db.termsTemplates.list();

export async function saveTemplate(tpl) {
  const saved = await db.termsTemplates.save(tpl);
  if (saved.isDefault) await setDefaultTemplate(saved.id);
  return saved;
}

export async function deleteTemplate(id) {
  const tpl = await db.termsTemplates.get(id);
  await db.termsTemplates.remove(id);
  // Remove the stored PDF unless an invoice still points to it
  if (tpl?.format === 'pdf' && tpl.file?.id) {
    const inUse = (await db.invoices.list()).some((r) => r.data?.termsFile?.id === tpl.file.id);
    if (!inUse) await db.files.remove(tpl.file.id).catch(() => {});
  }
}

export async function setDefaultTemplate(id) {
  const all = await db.termsTemplates.list();
  for (const t of all) {
    const want = t.id === id;
    if (Boolean(t.isDefault) !== want) await db.termsTemplates.save({ ...t, isDefault: want });
  }
}

export async function getDefaultTemplate() {
  return (await db.termsTemplates.list()).find((t) => t.isDefault) || null;
}
