import { Font } from '@react-pdf/renderer';

// Noto Sans: the "latin" files carry everyday text; the "latin-ext" files carry the ₹ sign.
// `sources` maps weight -> { latin, ext } (URLs in the browser, file paths in Node).
let registered = false;

export function registerFonts(sources) {
  if (registered) return;
  Font.register({
    family: 'NotoSans',
    fonts: Object.entries(sources).map(([w, s]) => ({ src: s.latin, fontWeight: Number(w) })),
  });
  Font.register({
    family: 'NotoSansExt',
    fonts: Object.entries(sources).map(([w, s]) => ({ src: s.ext, fontWeight: Number(w) })),
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

export const FONT_STACK = ['NotoSans', 'NotoSansExt'];
