import { getDocumentTemplate } from './documentTemplates/index.js';
import { getMergedDocumentSettings } from './documentSettings.js';
import { createDocumentStyles } from './common/styles.js';
import { createPDFFooter } from './common/footer.js';
import { configureFonts } from './common/fonts.js';

let pdfMakeCache = null;

/**
 * Lazy loads pdfmake library on demand.
 * Prevents bloating the initial main bundle.
 */
export const loadPdfMake = async () => {
  if (pdfMakeCache) return pdfMakeCache;

  try {
    const pdfMakeModule = await import('pdfmake/build/pdfmake.js');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts.js');

    const pdfMake = pdfMakeModule.default || pdfMakeModule;
    const pdfFonts = pdfFontsModule.default || pdfFontsModule;

    pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;
    configureFonts(pdfMake);

    pdfMakeCache = pdfMake;
    return pdfMakeCache;
  } catch (err) {
    console.error('Failed to lazy load pdfmake library', err);
    throw new Error('PDF Engine failed to initialize pdfmake library.');
  }
};

/**
 * Helper to convert an image URL or WebP data URI to a PNG Base64 Data URL for pdfmake.
 */
export const convertImageToBase64Png = (url) => {
  if (!url || typeof url !== 'string') return Promise.resolve(null);
  if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) {
    return Promise.resolve(url);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 120;
        canvas.height = img.naturalHeight || img.height || 120;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Generic Document Generation Function.
 * Accepts templateId ('receipt', 'ledger', etc.), raw backend JSON data, and options.
 */
export const generateDocument = async ({ templateId = 'receipt', data = {}, options = {} }) => {
  const pdfMake = await loadPdfMake();

  // 1. Get Template & Builder
  const templateConfig = getDocumentTemplate(templateId);
  const mergedSettings = getMergedDocumentSettings(templateConfig.defaultOptions, options);

  // 2. Transform Data via Builder
  const templateData = templateConfig.builder ? templateConfig.builder(data) : data;

  // 3. Pre-process logo image URL to PNG base64 data URL for pdfmake
  if (templateData.school && templateData.school.logoUrl && !templateData.school.logoBase64) {
    const base64Logo = await convertImageToBase64Png(templateData.school.logoUrl);
    if (base64Logo) {
      templateData.school.logoBase64 = base64Logo;
    }
  }

  // 4. Build Layout Definition via Template
  const docDefinition = templateConfig.template(templateData, mergedSettings);

  // 4. Attach Universal Options (Page Size, Margins, Orientation, Styles, Footer)
  docDefinition.pageSize = mergedSettings.pageSize;
  docDefinition.pageOrientation = mergedSettings.pageOrientation;
  docDefinition.pageMargins = mergedSettings.pageMargins;
  docDefinition.styles = createDocumentStyles(mergedSettings);

  // Attach Reusable Dynamic Footer
  if (mergedSettings.footerEnabled !== false) {
    docDefinition.footer = (currentPage, pageCount) =>
      createPDFFooter(currentPage, pageCount, mergedSettings);
  }

  // 5. Create PDF Instance
  return pdfMake.createPdf(docDefinition);
};

/**
 * Generates a PDF Blob URL for embedding inside an iframe preview modal.
 */
export const createPdfBlobUrl = async ({ templateId = 'receipt', data = {}, options = {} }) => {
  const pdfInstance = await generateDocument({ templateId, data, options });
  return new Promise((resolve, reject) => {
    try {
      pdfInstance.getBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Downloads a generated PDF with custom clean filename.
 * Example: Receipt_RCPT-2026-000123.pdf
 */
export const downloadPdfDocument = async ({
  templateId = 'receipt',
  data = {},
  filename = 'Document.pdf',
  options = {},
}) => {
  const pdfInstance = await generateDocument({ templateId, data, options });
  pdfInstance.download(filename);
};

/**
 * Direct PDF printing stream.
 * Prints the vector PDF directly without rendering HTML pages.
 */
export const printPdfDocument = async ({ templateId = 'receipt', data = {}, options = {} }) => {
  const pdfInstance = await generateDocument({ templateId, data, options });
  pdfInstance.print();
};

export default generateDocument;
