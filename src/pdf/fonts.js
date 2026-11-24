import { Font } from '@react-pdf/renderer';

// Noto Sans: the "latin" files carry everyday text; the "latin-ext" files carry the ₹ sign.
// `sources` maps weight -> { latin, ext } (URLs in the browser, file paths in Node).
// `italics` (optional) maps weight -> { latin, ext } italic files, used by custom T&C.
let registered = false;

export function registerFonts(sources, italics = {}) {
  if (registered) return;
  const faces = (key) => [
    ...Object.entries(sources).map(([w, src]) => ({ src: src[key], fontWeight: Number(w) })),
    ...Object.entries(italics).map(([w, src]) => ({ src: src[key], fontWeight: Number(w), fontStyle: 'italic' })),
  ];
  Font.register({ family: 'NotoSans', fonts: faces('latin') });
  Font.register({ family: 'NotoSansExt', fonts: faces('ext') });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

export const FONT_STACK = ['NotoSans', 'NotoSansExt'];
