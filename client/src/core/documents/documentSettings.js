/**
 * Generic Document Settings Module for Universal PDF Engine.
 * Configures paper size, orientation, margins, branding colors, and component toggles.
 * Supports template-level and invocation-level overrides.
 */

const BRAND_PDF_CONFIG = {
  productName: 'AxomSetu',
  companyName: 'NEXUMBYTE',
  poweredBy: 'Powered by NEXUMBYTE',
  productTagline: 'School Management Platform',
};

const DEFAULT_DOCUMENT_SETTINGS = {
  pageSize: 'A4',
  pageOrientation: 'portrait', // 'portrait' | 'landscape'
  pageMargins: [30, 30, 30, 35], // [left, top, right, bottom]
  primaryColor: '#1e1b4b', // Indigo 950
  secondaryColor: '#4f46e5', // Indigo 600
  neutralColor: '#64748b', // Slate 500
  headerEnabled: true,
  headerLogoEnabled: true,
  footerEnabled: true,
  watermarkEnabled: true,
  signatureBlockEnabled: true,
  fontSize: 8,
  branding: BRAND_PDF_CONFIG,
};

/**
 * Merges global default settings with template-specific and runtime options.
 */
export const getMergedDocumentSettings = (templateSettings = {}, runtimeOptions = {}) => {
  return {
    ...DEFAULT_DOCUMENT_SETTINGS,
    ...templateSettings,
    ...runtimeOptions,
  };
};

export default getMergedDocumentSettings;
