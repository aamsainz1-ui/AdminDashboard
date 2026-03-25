import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Language } from '../types';
import { checkLiveness } from '../services/faceService';

interface FaceScannerProps {
  onCapture: (base64Image: string, source: HTMLVideoElement | HTMLCanvasElement) => void;
  onCancel: () => void;
  isVerifying: boolean;
  statusMessage?: string;
  challenge: string;
  lang: Language;
  isAdmin?: boolean;
}

const FaceScanner: React.FC<FaceScannerProps> = ({ onCapture, onCancel, isVerifying, statusMessage, challenge, lang, isAdmin }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multi-step liveness: step 1 = blink, step 2 = capture
  const [livenessStep, setLivenessStep] = useState<1 | 2>(1);
  const [livenessMsg, setLivenessMsg] = useState<string>('');
  const livenessIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const livenessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFirstTime = !challenge.includes('ยืนยันตัวตน') && (
    challenge.toLowerCase().includes('first') ||
    challenge.toLowerCase().includes('registration') ||
    challenge.toLowerCase().includes('ลงทะเบียน')
  );

  const stepTitle = isFirstTime
    ? 'ลงทะเบียนใบหน้า — กะพริบตา'
    : 'ยืนยันตัวตน — กะพริบตา';

  const t = {
    title: lang === Language.TH ? 'ยืนยันตัวตนด้วยใบหน้า' : 'Identity Verification',
    subTitle: lang === Language.TH ? 'ระบบตรวจสอบความปลอดภัยสากล' : 'Global Biometric Standard',
    instruction: lang === Language.TH ? 'คำสั่งที่ต้องทำ' : 'Liveness Challenge',
    statusDefault: lang === Language.TH ? 'กรุณามองกล้องและทำตามคำสั่ง' : 'Please face the camera and follow instructions',
    captureBtn: lang === Language.TH ? 'ถ่ายภาพและยืนยัน' : 'Verify Identity',
    processing: lang === Language.TH ? 'กำลังประมวลผล...' : 'Verifying...',
    cameraErr: lang === Language.TH ? 'ไม่สามารถเข้าถึงกล้องได้' : 'Camera Access Error',
    reload: lang === Language.TH ? 'รีโหลดหน้าเว็บ' : 'Reload',
    blinkNow: lang === Language.TH ? 'กะพริบตาเพื่อยืนยันว่าเป็นบุคคลจริง' : 'Blink to confirm you are a real person',
    blinkDetected: lang === Language.TH ? 'ตรวจพบการกะพริบตา ✓ กำลังถ่ายภาพ...' : 'Blink detected ✓ Capturing...',
    blinkTimeout: lang === Language.TH ? 'หมดเวลา — กะพริบตาไม่สำเร็จ กรุณาลองใหม่' : 'Timeout — Blink not detected, please try again',
    step1Label: lang === Language.TH ? 'ขั้นตอน 1/2: กะพริบตา' : 'Step 1/2: Blink',
    step2Label: lang === Language.TH ? 'ขั้นตอน 2/2: ถ่ายภาพ' : 'Step 2/2: Capture',
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startCamera() {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
        });
        setStream(activeStream);
        if (videoRef.current) videoRef.current.srcObject = activeStream;
      } catch (err) {
        setError(t.cameraErr);
      }
    }
    startCamera();
    return () => {
      if (activeStream) activeStream.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Start blink detection when video stream is ready
  const startBlinkDetection = useCallback(() => {
    if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);
    if (livenessTimeoutRef.current) clearTimeout(livenessTimeoutRef.current);

    setLivenessMsg(t.blinkNow);

    // Timeout after 10 seconds
    livenessTimeoutRef.current = setTimeout(() => {
      if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);
      setLivenessMsg(t.blinkTimeout);
    }, 10000);

    // Check every 200ms
    livenessIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const result = await checkLiveness(videoRef.current, 'blink');
        if (result.passed) {
          clearInterval(livenessIntervalRef.current!);
          clearTimeout(livenessTimeoutRef.current!);
          setLivenessMsg(t.blinkDetected);
          // Auto proceed to capture after brief delay
          setTimeout(() => {
            setLivenessStep(2);
            handleCapture();
          }, 500);
        }
      } catch {
        // Silently continue polling
      }
    }, 200);
  }, []);

  // Begin blink detection once stream is available
  useEffect(() => {
    if (stream && livenessStep === 1 && !isVerifying) {
      // Small delay to ensure video is playing
      const timer = setTimeout(startBlinkDetection, 800);
      return () => clearTimeout(timer);
    }
  }, [stream, livenessStep, isVerifying, startBlinkDetection]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);
      if (livenessTimeoutRef.current) clearTimeout(livenessTimeoutRef.current);
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl, video);
      }
    }
  };

  const handleManualCapture = () => {
    // Manual capture only allowed in step 2 (after blink passed)
    if (livenessStep === 2 || livenessMsg === t.blinkTimeout) {
      handleCapture();
    }
  };

  const currentInstruction = livenessStep === 1 ? stepTitle : (lang === Language.TH ? 'มองกล้องตรงๆ' : 'Look straight at camera');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
      <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_0_80px_rgba(37,99,235,0.2)] border border-white/20">
        <div className="p-10 pb-6 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.title}</h3>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] mt-1">{t.subTitle}</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 p-2.5 hover:bg-slate-50 rounded-2xl transition-all" title="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-10 space-y-8">
          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${livenessStep === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'}`}>
              {livenessStep > 1 ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>1</span>
              )}
              <span>{lang === Language.TH ? 'กะพริบตา' : 'Blink'}</span>
            </div>
            <div className="w-6 h-0.5 bg-slate-200"></div>
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${livenessStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <span>2</span>
              <span>{lang === Language.TH ? 'ถ่ายภาพ' : 'Capture'}</span>
            </div>
          </div>

          <div className="bg-blue-600/5 border border-blue-600/10 p-6 rounded-[2rem] flex items-center space-x-5">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{t.instruction}</p>
              <p className="text-base font-black text-slate-900">{currentInstruction}</p>
            </div>
          </div>

          <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-slate-900 border-4 border-slate-50 shadow-2xl">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <p className="text-red-400 text-sm font-black">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-6 px-6 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{t.reload}</button>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-90" />

                {/* Scanning Animation */}
                {!isVerifying && (
                  <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#60a5fa] absolute top-0 animate-[scan_3s_linear_infinite]"></div>
                  </div>
                )}

                {isVerifying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-600/20 [-webkit-backdrop-filter:blur(10px)] [backdrop-filter:blur(10px)] z-20">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <p className="mt-8 text-white font-black text-sm uppercase tracking-[0.3em]">{t.processing}</p>
                  </div>
                )}

                {/* Liveness step 1 overlay */}
                {livenessStep === 1 && !isVerifying && livenessMsg && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/90 to-transparent px-6 py-5 z-10">
                    <p className="text-white text-[11px] font-black text-center uppercase tracking-widest">{livenessMsg}</p>
                  </div>
                )}

                {/* Corners Decoration */}
                <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-white/50 rounded-tl-xl"></div>
                <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-white/50 rounded-tr-xl"></div>
                <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-white/50 rounded-bl-xl"></div>
                <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-white/50 rounded-br-xl"></div>
              </>
            )}
          </div>

          <div className="text-center">
            <p className={`text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full inline-block ${statusMessage ? 'bg-red-50 text-red-500' : 'text-slate-400'}`}>
              {statusMessage || t.statusDefault}
            </p>

            {/* Bypass button: only show for admin when AI errors occur */}
            {isAdmin && statusMessage && (statusMessage.includes('เชื่อมต่อ') || statusMessage.includes('Google') || statusMessage.includes('AI')) && (
              <button
                onClick={() => onCapture("BYPASS_AI_EMERGENCY", canvasRef.current!)}
                className="mt-4 block w-full text-[10px] font-black text-blue-600 uppercase underline decoration-2 underline-offset-4 hover:text-blue-700"
              >
                {lang === Language.TH ? 'ข้ามการตรวจสอบ (ใช้ในกรณีฉุกเฉิน)' : 'Skip Verification (Emergency)'}
              </button>
            )}

            <button
              onClick={handleManualCapture}
              disabled={isVerifying || !!error || !stream || livenessStep === 1}
              className={`w-full mt-8 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${isVerifying || !!error || !stream || livenessStep === 1
                ? 'bg-slate-100 text-slate-300 shadow-none'
                : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/20'
                }`}
            >
              {isVerifying ? t.processing : livenessStep === 1 ? (lang === Language.TH ? 'รอตรวจจับการกะพริบตา...' : 'Waiting for blink...') : t.captureBtn}
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(400px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default FaceScanner;
