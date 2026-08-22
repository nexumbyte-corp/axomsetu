import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, UploadCloud, Crop } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { toast } from '../ui/Toast.jsx';
import { studentService } from '../../services/student.service.js';

// Passport Ratio Constant: 3.5cm x 4.5cm -> 0.7777777777777778
const PASSPORT_ASPECT_RATIO = 3.5 / 4.5;
const VIEWPORT_WIDTH = 280;
const VIEWPORT_HEIGHT = Math.round(VIEWPORT_WIDTH / PASSPORT_ASPECT_RATIO); // 360px

export const PassportPhotoCropModal = ({ isOpen, onClose, file, onCropSuccess }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);

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

  // Handle Canvas Crop & Cloudinary Upload
  const handleCropAndUpload = async () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    // Output high-resolution passport size canvas (350px x 450px)
    const outputWidth = 350;
    const outputHeight = 450;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const scale = zoom;

    // Calculate crop parameters relative to display canvas
    const displayRatio = outputWidth / VIEWPORT_WIDTH;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // Draw background grid or white
    const displayedImgWidth = img.clientWidth * scale;
    const displayedImgHeight = img.clientHeight * scale;

    const drawX = (position.x + (VIEWPORT_WIDTH - displayedImgWidth) / 2) * displayRatio;
    const drawY = (position.y + (VIEWPORT_HEIGHT - displayedImgHeight) / 2) * displayRatio;
    const drawW = displayedImgWidth * displayRatio;
    const drawH = displayedImgHeight * displayRatio;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Convert Canvas to Blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          toast.error('Failed cropping image canvas');
          return;
        }

        setUploading(true);
        try {
          const formData = new FormData();
          const croppedFile = new File([blob], `student_passport_${Date.now()}.jpg`, { type: 'image/jpeg' });
          formData.append('logo', croppedFile); // backend uploadSingleImage field name

          const res = await studentService.uploadPhoto(formData);
          if (res.data && res.data.photoUrl) {
            toast.success(`Photo cropped & uploaded to Cloudinary (${res.data.sizeKb || '<20'} KB)!`);
            onCropSuccess(res.data.photoUrl, res.data.sizeKb);
            onClose();
          } else {
            toast.error(res.message || 'Failed to upload photo');
          }
        } catch (err) {
          toast.error(err.message || 'Failed uploading cropped photo to Cloudinary');
        } finally {
          setUploading(false);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Crop Student Photo</h3>
              <p className="text-[11px] text-slate-500">Auto Passport Ratio (3.5 : 4.5) • Max 20KB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Interactive Canvas Viewport */}
        <div className="p-5 flex-1 flex flex-col items-center justify-center bg-slate-900/5 select-none overflow-y-auto">
          {imageSrc && (
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-xl border-2 border-dashed border-indigo-500 shadow-xl bg-slate-900 cursor-move group"
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
              <div className="absolute inset-0 border-2 border-white/80 pointer-events-none rounded-lg shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] flex flex-col justify-between p-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-white/90 bg-slate-900/70 px-2 py-0.5 rounded backdrop-blur-xs">
                  <span>3.5 cm</span>
                  <span className="font-bold">PASSPORT SIZE</span>
                  <span>4.5 cm</span>
                </div>
                <div className="text-[10px] text-center text-white/70 bg-slate-900/50 py-0.5 rounded">
                  Drag to align photo inside box
                </div>
              </div>
            </div>
          )}

          {/* Zoom Controls Bar */}
          <div className="w-full mt-4 flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
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
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-600 min-w-[42px] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCropAndUpload}
            loading={uploading}
            loadingText="Compressing & Uploading..."
            icon={UploadCloud}
          >
            Crop & Save Photo
          </Button>
        </div>
      </div>
    </div>
  );
};
