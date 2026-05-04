import React, { useState } from 'react';
import { auth, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Activity, Chrome } from 'lucide-react';
import { cn } from '../App';

interface LoginProps {
  onLoginSuccess: (profile: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [step, setStep] = useState<'auth' | 'profile'>('auth');
  const [lotNumber, setLotNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      
      // Check if profile exists
      const docRef = doc(db, 'users', u.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        onLoginSuccess(docSnap.data());
      } else {
        setTempUser(u);
        setStep('profile');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal log masuk dengan Google. Sila cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUser) return;
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Admin Backdoor check
      let role = 'user';
      if (lotNumber.toUpperCase() === 'ADMIN' && password === 'ADMIN123') {
        role = 'admin';
      }

      const profileData = {
        lotNumber,
        phoneNumber,
        role,
        createdAt: serverTimestamp(),
        email: tempUser.email
      };

      await setDoc(doc(db, 'users', tempUser.uid), profileData);
      onLoginSuccess(profileData);
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan profil. Sila cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md card-hardware p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MeterReader Pro v3</h1>
          <p className="text-white/50 text-sm italic">Extreme AI Vision Technology</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'auth' ? (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <p className="text-sm text-white/60">Log masuk menggunakan Google untuk memulakan pendaftaran unit anda di Sutera Square.</p>
              </div>

              <button 
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full h-14 bg-white text-black rounded-full font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : <Chrome className="w-5 h-5" />}
                {isSubmitting ? 'Menyambung...' : 'Masuk dengan Google'}
              </button>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                  {error}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.form 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleProfileSubmit} 
              className="space-y-6"
            >
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold">Pendaftaran Identiti</h2>
                <p className="text-xs text-white/40">Lengkapkan maklumat unit untuk pendaftaran berkunci</p>
              </div>

              <div>
                <label className="label-micro text-blue-400">No. Lot (Sutera Square)</label>
                <input 
                  type="text" 
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                  placeholder="Cth: A-01-01"
                  required
                />
              </div>

              <div>
                <label className="label-micro text-blue-400">No. Telefon</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                  placeholder="Cth: 0123456789"
                  required
                />
              </div>

              {lotNumber.toUpperCase() === 'ADMIN' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                >
                  <label className="label-micro text-red-500">Master Secret Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-red-500/20 rounded-lg p-3 outline-none focus:border-red-500 transition-colors"
                    placeholder="ADMIN123"
                  />
                </motion.div>
              )}

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full btn-action-base bg-blue-600 hover:bg-blue-700 text-white h-14 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Activity className="w-4 h-4 animate-spin" /> : null}
                Lengkapkan Pendaftaran
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Extreme AI Vision Technology</p>
        </div>
      </div>
    </motion.div>
  );
}
