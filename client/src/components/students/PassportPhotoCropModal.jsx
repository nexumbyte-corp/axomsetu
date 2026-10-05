import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Crop } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { toast } from '../ui/Toast.jsx';

// Passport Ratio Constant: 3.5cm x 4.5cm -> 0.7777777777777778
const PASSPORT_ASPECT_RATIO = 3.5 / 4.5;
const VIEWPORT_WIDTH = 250;
const VIEWPORT_HEIGHT = Math.round(VIEWPORT_WIDTH / PASSPORT_ASPECT_RATIO); // 321px

export const PassportPhotoCropModal = ({ isOpen, onClose, file, onCropSuccess }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Load image from file object
  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }, [file]);

  if (!isOpen || !file) return null;

  // Handle Drag / Pan start
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  // Handle Dragging
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Handle Canvas Crop (DO NOT upload immediately; will upload on final form submit)
  const handleSaveAndCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    // High-definition passport canvas (700px x 900px, 3.5:4.5 ratio)
    const outputWidth = 700;
    const outputHeight = 900;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const img = imageRef.current;
    const scale = zoom;

    // Calculate crop parameters relative to display canvas
    const displayRatio = outputWidth / VIEWPORT_WIDTH;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    const displayedImgWidth = img.clientWidth * scale;
    const displayedImgHeight = img.clientHeight * scale;

    const drawX = (position.x + (VIEWPORT_WIDTH - displayedImgWidth) / 2) * displayRatio;
    const drawY = (position.y + (VIEWPORT_HEIGHT - displayedImgHeight) / 2) * displayRatio;
    const drawW = displayedImgWidth * displayRatio;
    const drawH = displayedImgHeight * displayRatio;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Convert Canvas to Blob with high quality JPEG
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Failed cropping image canvas');
          return;
        }

        const sizeKb = Math.round(blob.size / 1024);
        const croppedFile = new File([blob], `student_passport_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        const previewUrl = canvas.toDataURL('image/jpeg', 0.92);

        if (onCropSuccess) {
          onCropSuccess(previewUrl, sizeKb, croppedFile);
        }
        toast.success('Passport photo cropped! It will be saved when submitting.');
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Crop className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Crop Student Photo</h3>
              <p className="text-[10px] text-slate-500">Standard Passport Ratio (3.5 : 4.5)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Interactive Canvas Viewport */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-900/5 select-none overflow-y-auto min-h-0">
          {imageSrc && (
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-xl border-2 border-dashed border-indigo-500 shadow-xl bg-slate-900 cursor-move group shrink-0"
              style={{ width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              {/* Image element transformed via scale and position */}
              <div
                className="w-full h-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop Target"
                  className="max-w-none max-h-none object-contain"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Passport Guide Overlay */}
              <div className="absolute inset-0 border-2 border-white/80 pointer-events-none rounded-lg shadow-[0_0_0_9999px_rgba(15,23,42,0.5)] flex flex-col justify-between p-2">
                <div className="flex justify-between items-center text-[9px] font-mono text-white/90 bg-slate-900/70 px-2 py-0.5 rounded backdrop-blur-xs">
                  <span>3.5 cm</span>
                  <span className="font-bold">PASSPORT SIZE</span>
                  <span>4.5 cm</span>
                </div>
                <div className="text-[9px] text-center text-white/80 bg-slate-900/60 py-0.5 rounded">
                  Drag to center photo in box
                </div>
              </div>
            </div>
          )}

          {/* Zoom Controls Bar */}
          <div className="w-full max-w-[280px] mt-3 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0.6"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-600 min-w-[36px] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveAndCrop}
            icon={Crop}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Save & Crop
          </Button>
        </div>
      </div>
    </div>
  );
};
