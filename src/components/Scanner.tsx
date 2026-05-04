import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera as CameraIcon, 
  ArrowLeft, 
  Lock, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle,
  Loader2,
  Send,
  History
} from 'lucide-react';
import { detectMeterReading } from '../services/geminiService';
import { calculateElectricity, calculateWater } from '../services/billing';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { cn } from '../App';

interface ScannerProps {
  meterType: 'water' | 'electric';
  profile: any;
  onBack: () => void;
}

export default function Scanner({ meterType, profile, onBack }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(true);
  const [detectedValue, setDetectedValue] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [baseline, setBaseline] = useState<number>(0);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showBaselineEdit, setShowBaselineEdit] = useState(false);
  const [isAnalyzingBaseline, setIsAnalyzingBaseline] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const baselineFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBaseline();
    const interval = setInterval(() => {
      if (isScanning && !isAnalyzing && !verificationMode && !showBaselineEdit) {
        captureAndAnalyze();
      }
    }, 4500); 
    return () => clearInterval(interval);
  }, [isScanning, isAnalyzing, verificationMode, showBaselineEdit]);

  const fetchBaseline = async () => {
    try {
      const readingsRef = collection(db, 'readings');
      const q = query(
        readingsRef,
        where('lotNumber', '==', profile.lotNumber),
        where('meterType', '==', meterType),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setBaseline(snap.docs[0].data().readingValue || 0);
      }
    } catch (e) {
      console.error("Baseline error:", e);
    }
  };

  const handleBaselineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingBaseline(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const reading = await detectMeterReading(base64, meterType);
        if (reading !== null) {
          setBaseline(reading);
        } else {
          alert("AI gagal mengecam angka. Sila masukkan secara manual.");
        }
        setIsAnalyzingBaseline(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsAnalyzingBaseline(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsAnalyzing(true);
    const base64 = imageSrc.split(',')[1];
    const reading = await detectMeterReading(base64, meterType);
    
    if (reading !== null) {
      setDetectedValue(reading);
      setManualValue(reading.toString());
    }
    setIsAnalyzing(false);
  };

  const handleLockReading = () => {
    if (detectedValue === null) return;
    setIsScanning(false);
    setVerificationMode(true);
  };

  const handleSave = async () => {
    const finalValue = parseFloat(manualValue);
    if (isNaN(finalValue)) return setError('Nilai tidak sah');
    
    if (finalValue < baseline) {
      return setError('Bacaan baru tidak boleh rendah dari rujukan!');
    }

    // Check Daily Lock
    try {
      const readingsRef = collection(db, 'readings');
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const q = query(
        readingsRef,
        where('lotNumber', '==', profile.lotNumber),
        where('meterType', '==', meterType),
        where('timestamp', '>=', Timestamp.fromDate(dayAgo))
      );
      const todaySnap = await getDocs(q);
      if (!todaySnap.empty && profile.role !== 'admin') {
        return setError('Sekatan Harian: Anda hanya boleh simpan sekali setiap 24 jam.');
      }

      setIsSaving(true);
      const netUsage = finalValue - baseline;
      let totalCost = 0;

      if (meterType === 'electric') {
        const billing = calculateElectricity(netUsage);
        totalCost = billing.total;
      } else {
        const billing = calculateWater(netUsage);
        totalCost = billing.total;
      }

      const readingData = {
        userId: auth.currentUser?.uid,
        lotNumber: profile.lotNumber,
        meterType,
        readingValue: finalValue,
        baselineReading: baseline,
        netUsage,
        totalCost,
        timestamp: serverTimestamp(),
        isVerified: true,
        location: { latitude: 0, longitude: 0 } // Dummy for now
      };

      await addDoc(collection(db, 'readings'), readingData);
      setSaveSuccess(true);
      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'readings');
    } finally {
      setIsSaving(false);
    }
  };

  const sendToWhatsApp = () => {
    const finalValue = parseFloat(manualValue);
    const netUsage = finalValue - baseline;
    const cost = meterType === 'electric' ? calculateElectricity(netUsage).total : calculateWater(netUsage).total;
    
    const message = `*METERREADER PRO V3 REPORT*\n\nLot: ${profile.lotNumber}\nJenis: ${meterType.toUpperCase()}\nBacaan: ${finalValue}\nRujukan: ${baseline}\nPenggunaan: ${netUsage.toFixed(2)}\nKos: RM ${cost.toFixed(2)}\nTarikh: ${new Date().toLocaleString()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between text-white bg-black/50 backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> <span>Kembali</span>
        </button>
        <div className="text-center">
          <span className="label-micro block">Lensa AI {meterType}</span>
          <span className="text-xs text-white/60">Lot {profile.lotNumber}</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {verificationMode ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md mx-4 card-hardware p-8 border border-white/20"
          >
            <div className="mb-8 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <h2 className="text-2xl font-bold">Sahkan Bacaan</h2>
              <p className="text-white/40 text-sm">Sila pastikan angka adalah sama seperti pada meter</p>
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <label className="label-micro">Output AI Gergasi</label>
                <input 
                  type="number" 
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  className="w-full bg-transparent text-center text-7xl font-mono font-bold text-white outline-none"
                />
                <div className="h-0.5 w-1/2 mx-auto bg-white/20 mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label className="label-micro">Rujukan</label>
                  <p className="font-mono text-lg">{baseline} {meterType === 'water' ? 'm³' : 'kWh'}</p>
                </div>
                <div>
                  <label className="label-micro">Penggunaan</label>
                  <p className="font-mono text-lg text-green-400">
                    {(parseFloat(manualValue) - baseline).toFixed(2)}
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 text-red-200 text-xs rounded-lg border border-red-500/50">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {saveSuccess ? (
                <div className="bg-green-500 text-white p-4 rounded-xl flex items-center justify-center gap-2 font-bold animate-bounce">
                  <Check className="w-6 h-6" /> BERJAYA DISIMPAN
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="btn-primary w-full bg-green-600 hover:bg-green-700 h-14 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                    Kunci & Simpan Cloud
                  </button>
                  <button 
                    onClick={sendToWhatsApp}
                    className="btn-secondary w-full border-green-500 text-green-500 h-14 flex items-center justify-center gap-2 hover:bg-green-50"
                  >
                    <Send className="w-5 h-5" /> Hantar WhatsApp
                  </button>
                  <button onClick={() => { setVerificationMode(false); setIsScanning(true); }} className="text-white/40 text-xs hover:text-white transition-colors py-2">
                    Imbas Semula
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'environment' }}
              className="w-full h-full object-cover"
              disablePictureInPicture={true}
              forceScreenshotSourceSize={false}
              ignoreVideoOrientation={true}
              imageSmoothing={true}
              mirrored={false}
              onUserMedia={() => {}}
              onUserMediaError={() => {}}
              screenshotQuality={1}
            />
            {/* Scanner Overlays */}
            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 overflow-hidden">
              <div className="relative w-full h-full border-2 border-white/10">
                {/* Dynamic Laser Line */}
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ 
                    top: ['0%', '100%', '0%'],
                    backgroundColor: isAnalyzing ? '#22d3ee' : (detectedValue ? '#10b981' : '#3b82f6'),
                    boxShadow: isAnalyzing 
                      ? '0 0 20px #22d3ee, 0 0 40px #22d3ee' 
                      : (detectedValue ? '0 0 20px #10b981, 0 0 40px #10b981' : '0 0 15px #3b82f6'),
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{ 
                    top: { duration: isAnalyzing ? 1.5 : 3, repeat: Infinity, ease: "linear" },
                    backgroundColor: { duration: 0.3 },
                    boxShadow: { duration: 0.3 },
                    opacity: { duration: 1, repeat: Infinity }
                  }}
                  className="absolute left-0 w-full h-[2px] z-10"
                />

                {/* Search box overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    animate={{ 
                      borderColor: detectedValue ? '#10b981' : '#3b82f6',
                      scale: isAnalyzing ? 1.02 : 1
                    }}
                    className="w-72 h-40 border-2 border-dashed absolute flex flex-col justify-between transition-colors duration-300"
                  >
                    <div className="flex justify-between w-full">
                       <motion.div 
                        animate={{ borderColor: detectedValue ? '#10b981' : '#3b82f6' }}
                        className="w-6 h-6 border-t-4 border-l-4 -m-[4px]" 
                       />
                       <motion.div 
                        animate={{ borderColor: detectedValue ? '#10b981' : '#3b82f6' }}
                        className="w-6 h-6 border-t-4 border-r-4 -m-[4px]" 
                       />
                    </div>
                    <div className="flex justify-between w-full">
                       <motion.div 
                        animate={{ borderColor: detectedValue ? '#10b981' : '#3b82f6' }}
                        className="w-6 h-6 border-b-4 border-l-4 -m-[4px]" 
                       />
                       <motion.div 
                        animate={{ borderColor: detectedValue ? '#10b981' : '#3b82f6' }}
                        className="w-6 h-6 border-b-4 border-r-4 -m-[4px]" 
                       />
                    </div>

                    {/* Scanning indicator text */}
                    <AnimatePresence>
                      {isAnalyzing && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute -top-10 left-0 right-0 text-center"
                        >
                          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.2em] animate-pulse">
                            Menganalisis...
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* AI HUD */}
            <div className="absolute bottom-32 left-0 right-0 px-8 pointer-events-none">
              <div className="max-w-xs mx-auto bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex flex-col gap-3 pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="label-micro text-blue-400">Deteksi Live AI</label>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono text-white font-bold">
                        {isAnalyzing ? (
                          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity }}>
                            ...
                          </motion.span>
                        ) : detectedValue || '0000.0'}
                      </span>
                      <span className="label-micro">{meterType === 'water' ? 'm³' : 'kWh'}</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center">
                    {isAnalyzing && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                <div className="flex items-center justify-between">
                   <div>
                      <label className="label-micro text-white/30">Rujukan Sedia Ada</label>
                      <p className="font-mono text-white/60 text-sm">{baseline} {meterType === 'water' ? 'm³' : 'kWh'}</p>
                   </div>
                   <button 
                    onClick={() => setShowBaselineEdit(true)}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                   >
                      <RefreshCw className="w-3 h-3 text-white/40" />
                   </button>
                </div>
              </div>
            </div>

            {/* Baseline Edit Modal Overlay */}
            <AnimatePresence>
              {showBaselineEdit && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-6 pointer-events-auto"
                >
                  <motion.div 
                    initial={{ y: 20, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    className="w-full max-w-sm card-hardware p-6 border border-white/10"
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <History className="w-5 h-5 text-blue-400" /> Tetapkan Rujukan
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label-micro">Key-in Manual</label>
                        <input 
                          type="number"
                          value={baseline}
                          onChange={(e) => setBaseline(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 font-mono text-xl outline-none focus:border-blue-500"
                          placeholder="Cth: 1234.5"
                        />
                      </div>
                      
                      <div className="relative">
                        <label className="label-micro">Atau Upload Gambar</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          ref={baselineFileInputRef}
                          onChange={handleBaselineUpload}
                        />
                        <button 
                          onClick={() => baselineFileInputRef.current?.click()}
                          disabled={isAnalyzingBaseline}
                          className="w-full h-12 bg-white/5 border border-white/10 border-dashed rounded-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                        >
                          {isAnalyzingBaseline ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CameraIcon className="w-4 h-4" />
                          )}
                          {isAnalyzingBaseline ? 'Menganalisis...' : 'Ambil dari Galeri'}
                        </button>
                      </div>

                      <button 
                        onClick={() => setShowBaselineEdit(false)}
                        className="w-full btn-primary h-12 mt-4"
                      >
                        Selesai
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Button */}
            <div className="absolute bottom-8 left-0 right-0 px-8">
              <button 
                onClick={handleLockReading}
                disabled={detectedValue === null}
                className={cn(
                  "w-full h-16 rounded-full font-bold flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95",
                  detectedValue === null ? "bg-white/10 text-white/20" : "bg-white text-black hover:bg-gray-100"
                )}
              >
                <Lock className="w-6 h-6" /> KUNCI BACAAN
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
