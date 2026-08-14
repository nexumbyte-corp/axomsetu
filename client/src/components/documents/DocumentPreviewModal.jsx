import React, { useState, useEffect } from 'react';
import { Printer, Download, X, Loader2, FileText } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { toast } from '../ui/Toast.jsx';

export const DocumentPreviewModal = ({
  isOpen = false,
  onClose,
  templateId = 'receipt',
  data = null,
  filename = 'Document.pdf',
  title = 'Document PDF Preview',
  options = {},
}) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const generatePreview = async () => {
      if (!isOpen || !data) {
        setBlobUrl(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { createPdfBlobUrl } = await import('../../core/documents/documentEngine.js');
        const url = await createPdfBlobUrl({ templateId, data, options });
        if (active) {
          setBlobUrl(url);
        }
      } catch (err) {
        console.error('Failed generating PDF preview', err);
        if (active) {
          setError('Unable to generate PDF document preview.');
          toast.error('PDF generation failed.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    generatePreview();

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, data, templateId]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      const { downloadPdfDocument } = await import('../../core/documents/documentEngine.js');
      await downloadPdfDocument({ templateId, data, filename, options });
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error('Failed downloading PDF.');
    }
  };

  const handlePrint = async () => {
    try {
      const { printPdfDocument } = await import('../../core/documents/documentEngine.js');
      await printPdfDocument({ templateId, data, options });
    } catch (err) {
      toast.error('Failed printing PDF document.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500 font-mono">{filename}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={loading || !blobUrl}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              disabled={loading || !blobUrl}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download PDF
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-100 relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 z-10">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-700">Generating PDF Vector Document...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600 space-y-2">
              <p className="font-bold">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-none"
              title="PDF Document Preview"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
