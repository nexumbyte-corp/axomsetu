import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { toast } from '../ui/Toast.jsx';

export const CameraCaptureModal = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackNative,
}) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [flash, setFlash] = useState(false);

  // Legal Permission States: 'checking' | 'prompt' | 'granted' | 'denied' | 'error'
  const [permissionState, setPermissionState] = useState('checking');
  const [userConsented, setUserConsented] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'DENIED' | 'NOT_SECURE' | 'NOT_FOUND' | 'IN_USE'

  // Check permissions & secure context on modal mount/open
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setPermissionState('checking');
      setUserConsented(false);
      setCameraError(null);
      setErrorType(null);
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
          // Fallback if permissions.query is not implemented
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
    if (isOpen && userConsented && permissionState !== 'denied' && errorType !== 'NOT_SECURE') {
      startCameraStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, userConsented, facingMode]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Failed capturing photo from video stream');
      return;
    }

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Failed generating image snapshot');
          return;
        }

        const file = new File([blob], `camera_photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        stopStream();
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Capture Student Photo</h3>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Encrypted Local Stream</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Content Area */}
        <div className="relative flex-1 bg-black min-h-[340px] sm:min-h-[400px] flex items-center justify-center overflow-hidden">
          {/* Flash Effect Overlay */}
          {flash && <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200" />}

          {/* ── CASE 1: Pre-Permission Privacy Disclosure Request Card ── */}
          {!userConsented && permissionState !== 'denied' && errorType !== 'NOT_SECURE' && (
            <div className="p-6 text-center max-w-sm space-y-4 mx-auto my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 shadow-lg shadow-indigo-950/50">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Camera Permission & Privacy</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Camera access is requested to capture the student&apos;s passport photo directly from this device.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left space-y-1.5 text-[11px] text-slate-300 shadow-inner">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Privacy & Compliance Guarantee</span>
                </div>
                <p className="text-slate-400 leading-normal">
                  Your video feed is processed <strong>locally in your browser</strong> solely for cropping. No background stream or audio is recorded or sent to any server.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 border-0 font-bold shadow-lg shadow-emerald-950/40"
                  icon={Camera}
                  onClick={() => {
                    setUserConsented(true);
                    startCameraStream();
                  }}
                >
                  Grant Permission & Allow Camera
                </Button>

                {onFallbackNative && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-slate-300 border-slate-700 hover:bg-slate-800"
                    icon={Smartphone}
                    onClick={() => {
                      handleClose();
                      onFallbackNative();
                    }}
                  >
                    Upload File / Use Mobile Camera App
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── CASE 2: Camera Access Blocked / Denied or Error Guidance Card ── */}
          {(permissionState === 'denied' || errorType) && (
            <div className="p-6 text-center max-w-sm space-y-4 mx-auto my-auto animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {errorType === 'NOT_SECURE'
                    ? 'HTTPS Connection Required'
                    : errorType === 'NOT_FOUND'
                    ? 'No Camera Found'
                    : errorType === 'IN_USE'
                    ? 'Camera Busy'
                    : 'Camera Access Blocked'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {cameraError || 'Browser privacy settings are blocking camera access.'}
                </p>
              </div>

              {errorType === 'DENIED' && (
                <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-left space-y-2 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How to enable camera access:</span>
                  </div>
                  <ol className="list-decimal list-inside text-slate-300 space-y-1 font-medium pl-1">
                    <li>Click the <strong>Lock / Settings icon 🔒</strong> in your browser URL bar.</li>
                    <li>Open <strong>Site Settings</strong> or <strong>Permissions</strong>.</li>
                    <li>Set <strong>Camera</strong> to <strong>Allow</strong>.</li>
                    <li>Click <strong>Try Again</strong> below.</li>
                  </ol>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {errorType === 'DENIED' && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 border-0 font-bold"
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
                    className="w-full text-slate-300 border-slate-700 hover:bg-slate-800"
                    icon={Smartphone}
                    onClick={() => {
                      handleClose();
                      onFallbackNative();
                    }}
                  >
                    Upload File / Use Mobile Camera App
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ── CASE 3: Active Camera Feed & Video Stream View ── */}
          {userConsented && !cameraError && permissionState !== 'denied' && (
            <>
              {loadingCamera && (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
                  <span className="text-xs font-semibold">Starting secure camera stream...</span>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Passport Frame Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[210px] h-[270px] sm:w-[240px] sm:h-[308px] rounded-2xl border-2 border-dashed border-emerald-400/70 bg-emerald-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between p-3">
                  <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="w-3 h-3" />
                    <span>PASSPORT GUIDE (3.5:4.5)</span>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-300 bg-slate-900/80 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-slate-700">
                    Center student face inside frame
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions (Only shown when active camera stream is running) */}
        {userConsented && !cameraError && permissionState !== 'denied' && (
          <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleFacingMode}
              disabled={loadingCamera}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              title="Flip camera (Front / Back)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flip Camera</span>
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={loadingCamera || !stream}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white bg-red-500 animate-pulse" />
              <span>Capture Photo</span>
            </button>

            {onFallbackNative ? (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onFallbackNative();
                }}
                className="flex items-center gap-1 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                title="Use native mobile camera input"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Native App</span>
              </button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                onClick={handleClose}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
