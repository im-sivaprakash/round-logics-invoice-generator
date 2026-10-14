import { registerFonts } from './fonts.js';
import r400 from '../assets/fonts/NotoSans-400.woff?url';
import r600 from '../assets/fonts/NotoSans-600.woff?url';
import r700 from '../assets/fonts/NotoSans-700.woff?url';
import e400 from '../assets/fonts/NotoSansExt-400.woff?url';
import e600 from '../assets/fonts/NotoSansExt-600.woff?url';
import e700 from '../assets/fonts/NotoSansExt-700.woff?url';

registerFonts({
  400: { latin: r400, ext: e400 },
  600: { latin: r600, ext: e600 },
  700: { latin: r700, ext: e700 },
});
