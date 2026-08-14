import { useEffect } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig.js';

/**
 * Dynamically updates document title with standard AxomSetu branding architecture.
 * Example: useDocumentTitle('Dashboard') -> "AxomSetu | Dashboard"
 */
export const useDocumentTitle = (title, overrideFull = false) => {
  useEffect(() => {
    if (overrideFull && title) {
      document.title = title;
    } else if (title) {
      document.title = `${BRAND_CONFIG.productName} | ${title}`;
    } else {
      document.title = `${BRAND_CONFIG.productName} — ${BRAND_CONFIG.productTagline}`;
    }
  }, [title, overrideFull]);
};

export default useDocumentTitle;
