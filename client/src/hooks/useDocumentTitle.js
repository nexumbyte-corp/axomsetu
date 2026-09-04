import { useEffect } from 'react';
import { BRAND_CONFIG } from '../config/brandConfig.js';
import { DEFAULT_SEO } from '../config/seoConfig.js';

/**
 * Helper function to safely set meta tag content by selector or create if missing
 */
const setMetaTag = (selector, nameOrProperty, value) => {
  if (!value) return;
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    const isProperty = selector.includes('property=');
    if (isProperty) {
      element.setAttribute('property', nameOrProperty);
    } else {
      element.setAttribute('name', nameOrProperty);
    }
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
};

/**
 * Helper function to update or create canonical link tag
 */
const setCanonicalLink = (canonicalPath) => {
  let element = document.querySelector('link[rel="canonical"]');
  const fullUrl = canonicalPath
    ? `${DEFAULT_SEO.siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : '/' + canonicalPath}`
    : DEFAULT_SEO.siteUrl;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', fullUrl);
};

/**
 * Dynamically updates document title and SEO meta tags (Description, Keywords, OG, Canonical).
 * Supports string title OR full SEO config object.
 *
 * Example Usage:
 * useDocumentTitle("Dashboard");
 * useDocumentTitle(PAGE_SEO.landing);
 */
export const useDocumentTitle = (seoParam, overrideFullParam = false) => {
  useEffect(() => {
    let titleStr = '';
    let descriptionStr = DEFAULT_SEO.defaultDescription;
    let keywordsStr = DEFAULT_SEO.defaultKeywords;
    let canonicalPath = '';
    let overrideFull = overrideFullParam;

    if (typeof seoParam === 'object' && seoParam !== null) {
      titleStr = seoParam.title || '';
      descriptionStr = seoParam.description || DEFAULT_SEO.defaultDescription;
      keywordsStr = seoParam.keywords || DEFAULT_SEO.defaultKeywords;
      canonicalPath = seoParam.canonical || '';
      if (typeof seoParam.overrideFull !== 'undefined') {
        overrideFull = seoParam.overrideFull;
      }
    } else if (typeof seoParam === 'string') {
      titleStr = seoParam;
    }

    // Set Document Title
    if (overrideFull && titleStr) {
      document.title = titleStr;
    } else if (titleStr) {
      document.title = `${BRAND_CONFIG.productName} | ${titleStr}`;
    } else {
      document.title = DEFAULT_SEO.defaultTitle;
    }

    // Update HTML Meta Description
    setMetaTag('meta[name="description"]', 'description', descriptionStr);

    // Update HTML Meta Keywords
    setMetaTag('meta[name="keywords"]', 'keywords', keywordsStr);

    // Update OpenGraph Title & Description
    const computedTitle = document.title;
    setMetaTag('meta[property="og:title"]', 'og:title', computedTitle);
    setMetaTag('meta[property="og:description"]', 'og:description', descriptionStr);
    setMetaTag('meta[name="twitter:title"]', 'twitter:title', computedTitle);
    setMetaTag('meta[name="twitter:description"]', 'twitter:description', descriptionStr);

    // Update Canonical URL
    setCanonicalLink(canonicalPath);
  }, [seoParam, overrideFullParam]);
};

export default useDocumentTitle;
