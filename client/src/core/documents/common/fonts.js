/**
 * Configures font definitions and VFS font loader for pdfmake.
 * Supports standard Roboto fonts and fallback Unicode text rendering.
 */
export const configureFonts = (pdfMakeInstance) => {
  if (!pdfMakeInstance) return;

  pdfMakeInstance.fonts = {
    Roboto: {
      normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
      bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
      italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
      bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf',
    },
  };
};

export default configureFonts;
