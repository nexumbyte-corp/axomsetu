import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { toast } from '../ui/Toast.jsx';

export const CameraCaptureModal = ({
  isOpen,
  onClose,
  onCapture,
  onCaptureSuccess,
  onFallbackNative,
}) => {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [flash, setFlash] = useState(false);

  // Auto-cropped capture preview state: { file, blob, url, sizeKb }
  const [capturedPreview, setCapturedPreview] = useState(null);

  // Legal Permission States: 'checking' | 'prompt' | 'granted' | 'denied' | 'error'
  const [permissionState, setPermissionState] = useState('checking');
  const [userConsented, setUserConsented] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'DENIED' | 'NOT_SECURE' | 'NOT_FOUND' | 'IN_USE'

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Check permissions & secure context on modal mount/open
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setPermissionState('checking');
      setUserConsented(false);
      setCameraError(null);
      setErrorType(null);
      setCapturedPreview(null);
      return;
    }

    const checkPermissions = async () => {
      // 1. Verify Secure Context (HTTPS or localhost)
      const isSecure =
        window.isSecureContext ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (!isSecure) {
        setPermissionState('denied');
        setErrorType('NOT_SECURE');
        setCameraError(
          'Camera stream requires a Secure HTTPS Connection. Browser privacy policies restrict camera feeds over unencrypted HTTP.'
        );
        return;
      }

      // 2. Query Web Permissions API if available
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'camera' });
          setPermissionState(status.state);

          if (status.state === 'granted') {
            setUserConsented(true);
          } else if (status.state === 'denied') {
            setErrorType('DENIED');
            setCameraError('Camera permission has been blocked in your browser settings.');
          }

          status.onchange = () => {
            setPermissionState(status.state);
            if (status.state === 'granted') {
              setUserConsented(true);
              setCameraError(null);
              setErrorType(null);
            } else if (status.state === 'denied') {
              setErrorType('DENIED');
              setCameraError('Camera access was blocked.');
            }
          };
        } else {
          setPermissionState('prompt');
        }
      } catch {
        setPermissionState('prompt');
      }
    };

    checkPermissions();
  }, [isOpen]);

  // Request & Start Camera Stream
  const startCameraStream = async () => {
    setLoadingCamera(true);
    setCameraError(null);
    setErrorType(null);

    // Stop existing stream tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setPermissionState('granted');
      setUserConsented(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => { });
      }
    } catch (err) {
      console.error('Camera stream access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorType('DENIED');
        setCameraError('Camera permission request was denied or blocked in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('error');
        setErrorType('NOT_FOUND');
        setCameraError('No camera hardware device was detected on your device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionState('error');
        setErrorType('IN_USE');
        setCameraError('Camera hardware is currently in use by another application.');
      } else {
        setPermissionState('error');
        setCameraError(err.message || 'Failed to initialize camera stream.');
      }
    } finally {
      setLoadingCamera(false);
    }
  };

  // Trigger stream acquisition when user consents
  useEffect(() => {
    if (isOpen && userConsented && permissionState !== 'denied' && errorType !== 'NOT_SECURE' && !capturedPreview) {
      startCameraStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, userConsented, facingMode, capturedPreview]);

  const handleClose = () => {
    stopStream();
    setCapturedPreview(null);
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Auto-Crop Photo to Viewfinder Frame Area (Exact 3.5 : 4.5 Passport Ratio)
  const handleCapture = () => {
    if (!videoRef.current || !frameRef.current) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video = videoRef.current;
    const frame = frameRef.current;

    const vW = video.videoWidth;
    const vH = video.videoHeight;
    if (!vW || !vH) {
      toast.error('Camera stream is not ready for capture');
      return;
    }

    const videoRect = video.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();

    // Scale factor applied by object-cover
    const scale = Math.max(videoRect.width / vW, videoRect.height / vH);
    const renderedW = vW * scale;
    const renderedH = vH * scale;

    // Centering offsets
    const offsetX = (renderedW - videoRect.width) / 2;
    const offsetY = (renderedH - videoRect.height) / 2;

    // Viewfinder position relative to video DOM container
    const frameLeftRel = frameRect.left - videoRect.left;
    const frameTopRel = frameRect.top - videoRect.top;

    // Crop box in intrinsic video pixels
    const cropW = Math.min(vW, Math.round(frameRect.width / scale));
    const cropH = Math.min(vH, Math.round(frameRect.height / scale));
    const cropY = Math.max(0, Math.min(vH - cropH, Math.round((frameTopRel + offsetY) / scale)));

    // Standard high-resolution passport output (3.5 : 4.5 ratio -> 420 x 540)
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 420;
    outputCanvas.height = 540;
    const ctx = outputCanvas.getContext('2d', { alpha: false });
    if (!ctx) {
      toast.error('Failed generating canvas context');
      return;
    }

    if (facingMode === 'user') {
      // Front camera video is displayed with CSS horizontal flip (scale-x-[-1])
      // Calculate crop from mirrored horizontal position
      const frameRightRel = videoRect.width - (frameLeftRel + frameRect.width);
      const cropX = Math.max(0, Math.min(vW - cropW, Math.round((frameRightRel + offsetX) / scale)));

      // Flip canvas horizontally to produce WYSIWYG matching user's mirror view
      ctx.translate(outputCanvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outputCanvas.width, outputCanvas.height);
    } else {
      // Back/Environment camera (unmirrored)
      const cropX = Math.max(0, Math.min(vW - cropW, Math.round((frameLeftRel + offsetX) / scale)));
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outputCanvas.width, outputCanvas.height);
    }

    // Generate reliable Data URL for preview (never expires or gets revoked prematurely)
    const previewDataUrl = outputCanvas.toDataURL('image/jpeg', 0.92);

    outputCanvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Failed generating photo blob');
          return;
        }

        const croppedFile = new File([blob], `passport_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        // Pause live video feed while in preview
        video.pause();

        setCapturedPreview({
          file: croppedFile,
          url: previewDataUrl,
          sizeKb: Math.round(blob.size / 1024),
        });
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => { });
    }
  };

  // Apply photo locally (DO NOT upload immediately; will upload on final form submit)
  const handleConfirmPhoto = () => {
    if (!capturedPreview) return;

    const previewToKeep = capturedPreview;
    setCapturedPreview(null);
    stopStream();

    if (onCaptureSuccess) {
      onCaptureSuccess(previewToKeep.url, previewToKeep.sizeKb, previewToKeep.file);
    } else if (onCapture) {
      onCapture(previewToKeep.file);
    }

    toast.success('Passport photo captured! It will be saved when submitting.');
    onClose();
  };

  // Optional manual crop fallback
  const handleManualCrop = () => {
    if (!capturedPreview) return;
    const file = capturedPreview.file;
    setCapturedPreview(null);
    stopStream();
    onClose();
    if (onCapture) {
      onCapture(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden flex flex-col h-[88vh] sm:h-[620px] max-h-[640px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white leading-tight">Passport Camera</h3>
              <p className="text-[10px] text-emerald-400 font-medium">Auto-crops to passport frame (3.5 × 4.5)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Content Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0">
          {/* Flash Effect Overlay */}
          {flash && <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200" />}

          {/* ── CASE 1: Pre-Permission Request Card ── */}
          {!userConsented && permissionState !== 'denied' && errorType !== 'NOT_SECURE' && (
            <div className="p-6 text-center max-w-sm space-y-3.5 mx-auto my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 shadow-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Camera Access Required</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Camera permission is needed to take and auto-crop the student&apos;s passport photo.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 border-0 font-bold py-1.5"
                  icon={Camera}
                  onClick={() => {
                    setUserConsented(true);
                    startCameraStream();
                  }}
                >
                  Enable Camera
                </Button>

                {onFallbackNative && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-slate-300 border-slate-700 hover:bg-slate-800 py-1"
                    icon={Smartphone}
                    onClick={() => {
                      handleClose();
                      onFallbackNative();
                    }}
                  >
                    Use File Upload
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── CASE 2: Camera Access Blocked / Denied ── */}
          {(permissionState === 'denied' || errorType) && (
            <div className="p-6 text-center max-w-sm space-y-3 mx-auto my-auto animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">
                  {errorType === 'NOT_SECURE'
                    ? 'HTTPS Required'
                    : errorType === 'NOT_FOUND'
                      ? 'No Camera Found'
                      : errorType === 'IN_USE'
                        ? 'Camera Busy'
                        : 'Camera Access Blocked'}
                </h4>
                <p className="text-[11px] text-slate-300">
                  {cameraError || 'Browser settings are blocking camera access.'}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {errorType === 'DENIED' && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 border-0 font-bold py-1"
                    icon={RefreshCw}
                    onClick={() => {
                      setUserConsented(true);
                      startCameraStream();
                    }}
                  >
                    Try Again
                  </Button>
                )}

                {onFallbackNative && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-slate-300 border-slate-700 hover:bg-slate-800 py-1"
                    icon={Smartphone}
                    onClick={() => {
                      handleClose();
                      onFallbackNative();
                    }}
                  >
                    Use File / Native Camera
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── CASE 3: Active Video Feed & Viewfinder ── */}
          {userConsented && !cameraError && permissionState !== 'denied' && (
            <>
              {/* Captured Photo Preview Screen */}
              {capturedPreview ? (
                <div className="flex flex-col items-center justify-center p-3 space-y-2.5 animate-in zoom-in-95 duration-150 z-20">
                  <div className="relative group">
                    <div className="w-[175px] h-[225px] sm:w-[200px] sm:h-[257px] rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-2xl bg-slate-800 ring-4 ring-emerald-500/20">
                      <img
                        src={capturedPreview.url}
                        alt="Auto-Cropped Passport"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-0.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Passport Ready (3.5 × 4.5)</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Size: ~{capturedPreview.sizeKb} KB • Will be uploaded on save
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {loadingCamera && (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400 z-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                      <span className="text-xs font-semibold">Starting camera...</span>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-transform duration-200 ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />

                  {/* Passport Frame Guide Overlay (Exact 3.5 : 4.5 ratio) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      ref={frameRef}
                      className="relative w-[182px] h-[234px] xs:w-[203px] xs:h-[261px] sm:w-[224px] sm:h-[288px] max-h-[82%] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.62)] flex flex-col items-center justify-between p-2.5 transition-all"
                    >
                      {/* Viewfinder Corner Target Brackets */}
                      <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-xl" />
                      <div className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-xl" />
                      <div className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-xl" />
                      <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-xl" />

                      {/* Frame Dashed Boundary */}
                      <div className="absolute inset-0 rounded-2xl border border-dashed border-emerald-400/35 pointer-events-none" />

                      {/* Reduced-radius Oval Silhouette Guide for Face Alignment */}
                      <div className="absolute inset-x-10 sm:inset-x-13 inset-y-11 sm:inset-y-14 rounded-[50%] border border-dashed border-white/30 pointer-events-none flex flex-col items-center justify-between py-2">
                        <span className="text-[7px] tracking-widest uppercase text-white/45 font-mono">Head</span>
                        <span className="text-[7px] tracking-widest uppercase text-white/45 font-mono">Chin</span>
                      </div>

                      {/* Top HUD Tag */}
                      <div className="relative z-10 flex items-center gap-1 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-300 border border-emerald-500/40 shadow-xs">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                        <span>PASSPORT (3.5 × 4.5)</span>
                      </div>

                      {/* Bottom Guidance Tag */}
                      <div className="relative z-10 text-[9px] font-medium text-slate-200 bg-slate-950/80 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-white/10 shadow-xs text-center">
                        Center face inside frame
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {userConsented && !cameraError && permissionState !== 'denied' && (
          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/95 shrink-0 flex items-center justify-between gap-2">
            {capturedPreview ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualCrop}
                    className="px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors hidden sm:inline-block"
                    title="Open manual cropping tool"
                  >
                    Adjust Crop
                  </button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmPhoto}
                    icon={Check}
                    className="bg-emerald-600 hover:bg-emerald-700 border-0 font-bold text-xs py-1.5 px-3.5 shadow-lg shadow-emerald-950/40"
                  >
                    Use This Photo
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Left: Camera Flip */}
                <div className="w-20 flex justify-start">
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    disabled={loadingCamera}
                    className="flex flex-col sm:flex-row items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                    title="Flip camera"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] sm:text-xs">Flip</span>
                  </button>
                </div>

                {/* Center: Tactile Circular Shutter Button */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={loadingCamera || !stream}
                    className="group relative flex items-center justify-center w-13 h-13 sm:w-15 sm:h-15 rounded-full border-4 border-white/80 p-0.5 shadow-lg shadow-emerald-950/50 hover:border-emerald-400 active:scale-90 transition-all disabled:opacity-40 disabled:active:scale-100"
                    title="Capture & Auto-Crop Photo"
                  >
                    <span className="w-full h-full rounded-full bg-white group-hover:bg-emerald-400 group-active:bg-emerald-500 transition-colors flex items-center justify-center shadow-inner">
                      <Camera className="w-5 h-5 text-slate-900 group-hover:text-slate-950" />
                    </span>
                  </button>
                </div>

                {/* Right: Upload / Cancel */}
                <div className="w-20 flex justify-end">
                  {onFallbackNative ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onFallbackNative();
                      }}
                      className="flex flex-col sm:flex-row items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                      title="Upload from device"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] sm:text-xs">Upload</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
