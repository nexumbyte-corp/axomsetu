import React, { useState } from 'react';
import { Eye, Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { toast } from '../ui/Toast.jsx';
import { DocumentPreviewModal } from './DocumentPreviewModal.jsx';
import { downloadPdfDocument, loadPdfMake } from '../../core/documents/documentEngine.js';

/**
 * Standard Reusable Document Action Controls Component.
 * Renders [ Preview ] and [ Download PDF ] buttons.
 */
export const DocumentActions = ({
  templateId = 'receipt',
  data = null,
  filename = 'Document.pdf',
  title = 'Document PDF Preview',
  options = {},
  variant = 'printOnly', // 'printOnly' | 'full' | 'compact' | 'minimal'
  className = '',
  disabled = false,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionType, setActionType] = useState(null); // 'download' | null

  // Pre-warm PDF engine and fonts on mount for instant zero-latency generation
  React.useEffect(() => {
    loadPdfMake().catch(() => {});
  }, []);

  const validateData = () => {
    if (!data) {
      toast.error('Unable to generate document: data unavailable.');
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateData()) return;
    setIsPreviewOpen(true);
  };

  const handleDownload = async () => {
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

  const isBtnDisabled = disabled || !data || isGenerating;

  if (variant === 'printOnly' || variant === 'default') {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={handleDownload}
        disabled={isBtnDisabled}
        isLoading={isGenerating && actionType === 'download'}
        loadingText="Downloading PDF..."
        className={className}
      >
        <Download className="w-4 h-4 mr-2" />
        Download PDF
      </Button>
    );
  }

  if (variant === 'minimal') {
    return (
      <>
        <div className={`flex items-center gap-1.5 ${className}`}>
          <button
            type="button"
            onClick={handlePreview}
            disabled={isBtnDisabled}
            title="Preview Document PDF"
            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isBtnDisabled}
            title="Download PDF"
            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating && actionType === 'download' ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        </div>

        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          templateId={templateId}
          data={data}
          filename={filename}
          title={title}
          options={options}
        />
      </>
    );
  }

  return (
    <>
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <Button
          variant="outline"
          size={variant === 'compact' ? 'xs' : 'sm'}
          onClick={handlePreview}
          disabled={isBtnDisabled}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          Preview
        </Button>

        <Button
          variant="primary"
          size={variant === 'compact' ? 'xs' : 'sm'}
          onClick={handleDownload}
          disabled={isBtnDisabled}
          isLoading={isGenerating && actionType === 'download'}
          loadingText="Generating PDF..."
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download PDF
        </Button>
      </div>

      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        templateId={templateId}
        data={data}
        filename={filename}
        title={title}
        options={options}
      />
    </>
  );
};

export default DocumentActions;
