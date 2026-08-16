/**
 * Configures font definitions and VFS font loader for pdfmake.
 * Standard Roboto fonts use pre-bundled VFS fonts for 0ms instantaneous rendering.
 * Noto Sans regional fonts (Assamese, Bengali, Hindi) are cached in VFS on-demand or pre-fetched.
 */

const FONT_URLS = {
  NotoSansBengali: {
    normal: { file: 'NotoSansBengali-Regular.ttf', url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf' },
    bold: { file: 'NotoSansBengali-Bold.ttf', url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansBengali/NotoSansBengali-Bold.ttf' },
  },
  NotoSansDevanagari: {
    normal: { file: 'NotoSansDevanagari-Regular.ttf', url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf' },
    bold: { file: 'NotoSansDevanagari-Bold.ttf', url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf' },
  },
};

const fontFetchPromises = new Map();

/**
 * Converts ArrayBuffer to Base64 string
 */
const bufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Fetches and caches a TTF font into pdfMake.vfs for 0-latency offline rendering.
 */
export const loadFontToVfs = async (pdfMakeInstance, fontName) => {
  if (!pdfMakeInstance || !FONT_URLS[fontName]) return;
  if (!pdfMakeInstance.vfs) pdfMakeInstance.vfs = {};

  const fontDef = FONT_URLS[fontName];
  if (pdfMakeInstance.vfs[fontDef.normal.file] && pdfMakeInstance.vfs[fontDef.bold.file]) {
    return; // Already cached in VFS
  }

  if (fontFetchPromises.has(fontName)) {
    await fontFetchPromises.get(fontName);
    return;
  }

  const fetchPromise = (async () => {
    try {
      const [resNormal, resBold] = await Promise.all([
        fetch(fontDef.normal.url),
        fetch(fontDef.bold.url),
      ]);

      if (resNormal.ok && resBold.ok) {
        const [bufNormal, bufBold] = await Promise.all([
          resNormal.arrayBuffer(),
          resBold.arrayBuffer(),
        ]);

        pdfMakeInstance.vfs[fontDef.normal.file] = bufferToBase64(bufNormal);
        pdfMakeInstance.vfs[fontDef.bold.file] = bufferToBase64(bufBold);

        pdfMakeInstance.fonts[fontName] = {
          normal: fontDef.normal.file,
          bold: fontDef.bold.file,
        };
      }
    } catch (err) {
      console.warn(`Failed preloading font ${fontName}, falling back to remote URL:`, err);
      pdfMakeInstance.fonts[fontName] = {
        normal: fontDef.normal.url,
        bold: fontDef.bold.url,
      };
    }
  })();

  fontFetchPromises.set(fontName, fetchPromise);
  await fetchPromise;
};

/**
 * Pre-load regional fonts asynchronously in background.
 */
export const preloadRegionalFonts = (pdfMakeInstance) => {
  if (!pdfMakeInstance) return;
  loadFontToVfs(pdfMakeInstance, 'NotoSansBengali').catch(() => {});
  loadFontToVfs(pdfMakeInstance, 'NotoSansDevanagari').catch(() => {});
};

let currentPdfMakeInstance = null;

export const configureFonts = (pdfMakeInstance) => {
  if (!pdfMakeInstance) return;
  currentPdfMakeInstance = pdfMakeInstance;

  // Use pre-bundled vfs_fonts for Roboto (0ms network cost, 100% Safari compatible)
  pdfMakeInstance.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };

  // Pre-load regional fonts in background to populate VFS and register font keys
  preloadRegionalFonts(pdfMakeInstance);
};

/**
 * Helper to detect text script and return suitable pdfmake font name if script-specific font is required.
 */
export const getFontForText = (text = '') => {
  if (typeof text !== 'string' || !text) return 'Roboto';
  
  // Check for Bengali / Assamese Unicode range (U+0980..U+09FF)
  if (/[\u0980-\u09FF]/.test(text)) {
    if (currentPdfMakeInstance?.fonts?.NotoSansBengali) {
      return 'NotoSansBengali';
    }
  }
  // Check for Devanagari / Hindi Unicode range (U+0900..U+097F)
  if (/[\u0900-\u097F]/.test(text)) {
    if (currentPdfMakeInstance?.fonts?.NotoSansDevanagari) {
      return 'NotoSansDevanagari';
    }
  }
  
  return 'Roboto';
};

export default configureFonts;

