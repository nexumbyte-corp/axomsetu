import React, { useState } from 'react';
import { Printer, Download, Loader2 } from 'lucide-react';
import { toast } from '../ui/Toast.jsx';
import { downloadPdfDocument, printPdfDocument, loadPdfMake } from '../../core/documents/documentEngine.js';

/**
 * Standard Central Document Action Controls Component.
 * Pure icon-only buttons for direct [ Print ] and [ Download PDF ].
 * PDF Preview has been removed across the entire application as requested.
 */
export const DocumentActions = ({
  templateId = 'receipt',
  data = null,
  filename = 'Document.pdf',
  title = 'Document',
  options = {},
  variant = 'default', // 'default' | 'printOnly' | 'downloadOnly' | 'minimal' | 'compact'
  className = '',
  disabled = false,
  showPrint = true,
  showDownload = true,
  onPrint = null,
  onDownload = null,
  size = 'sm', // 'xs' | 'sm' | 'md'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionType, setActionType] = useState(null); // 'print' | 'download' | null

  // Pre-warm PDF engine and fonts on mount for instant zero-latency generation
  React.useEffect(() => {
    loadPdfMake().catch(() => {});
  }, []);

  const validateData = () => {
    if (!data) {
      toast.error('Unable to process document: data unavailable.');
      return false;
    }
    return true;
  };

  const handlePrint = async (e) => {
    if (e) e.stopPropagation();
    if (onPrint) {
      onPrint();
      return;
    }
    if (!validateData()) return;

    setIsGenerating(true);
    setActionType('print');
    try {
      await printPdfDocument({
        templateId,
        data,
        options,
      });
    } catch (err) {
      console.error('Failed to print document:', err);
      toast.error('Unable to open print dialog. Please try again.');
    } finally {
      setIsGenerating(false);
      setActionType(null);
    }
  };

  const handleDownload = async (e) => {
    if (e) e.stopPropagation();
    if (onDownload) {
      onDownload();
      return;
    }
    if (!validateData()) return;

    setIsGenerating(true);
    setActionType('download');
    try {
      await downloadPdfDocument({
        templateId,
        data,
        filename,
        options,
      });
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download PDF document:', err);
      toast.error('Unable to generate the PDF. Please try again.');
    } finally {
      setIsGenerating(false);
      setActionType(null);
    }
  };

  const isBtnDisabled = disabled || (!data && !onPrint && !onDownload) || isGenerating;

  const shouldShowPrint = showPrint && variant !== 'downloadOnly';
  const shouldShowDownload = showDownload && variant !== 'printOnly';

  // Size styling tokens for icon-only action buttons
  const sizeClasses = {
    xs: 'p-1.5 rounded-md text-xs',
    sm: 'p-2 rounded-lg text-xs',
    md: 'p-2.5 rounded-xl text-sm',
  }[size] || 'p-2 rounded-lg text-xs';

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
  }[size] || 'w-4 h-4';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Print Icon Button */}
      {shouldShowPrint && (
        <button
          type="button"
          onClick={handlePrint}
          disabled={isBtnDisabled}
          title={`Print ${title || 'Document'}`}
          aria-label={`Print ${title || 'Document'}`}
          className={`${sizeClasses} border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-700 shadow-2xs transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-95`}
        >
          {isGenerating && actionType === 'print' ? (
            <Loader2 className={`${iconSizes} animate-spin text-indigo-600`} />
          ) : (
            <Printer className={iconSizes} />
          )}
        </button>
      )}

      {/* Download Icon Button */}
      {shouldShowDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={isBtnDisabled}
          title={`Download ${filename || 'PDF'}`}
          aria-label={`Download ${filename || 'PDF'}`}
          className={`${sizeClasses} border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-700 shadow-2xs transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-95`}
        >
          {isGenerating && actionType === 'download' ? (
            <Loader2 className={`${iconSizes} animate-spin text-indigo-600`} />
          ) : (
            <Download className={iconSizes} />
          )}
        </button>
      )}
    </div>
  );
};

export default DocumentActions;
