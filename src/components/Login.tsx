import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ShieldCheck, Activity, Lock } from 'lucide-react';
import { cn } from '../App';

interface LoginProps {
  onLoginSuccess: (profile: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [lotNumber, setLotNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Sign in Anonymously first to get a UID
      const authResult = await signInAnonymously(auth);
      const uid = authResult.user.uid;

      // 2. Check for Admin Backdoor
      let role = 'user';
      if (lotNumber.toUpperCase() === 'ADMIN' && password === 'ADMIN123') {
        role = 'admin';
      }

      // 3. Search for existing profile with this lot + phone
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        where('lotNumber', '==', lotNumber.trim()), 
        where('phoneNumber', '==', phoneNumber.trim())
      );
      const querySnapshot = await getDocs(q);

      let profileData: any;

      if (!querySnapshot.empty) {
        // Exists - Use existing data
        profileData = querySnapshot.docs[0].data();
        // Link the new anonymous UID to this profile (optional, but good for session persistence)
        await setDoc(doc(db, 'users', uid), profileData);
      } else {
        // New Registration
        profileData = {
          lotNumber: lotNumber.trim(),
          phoneNumber: phoneNumber.trim(),
          role,
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', uid), profileData);
      }

      onLoginSuccess(profileData);
    } catch (err) {
      console.error(err);
      setError('Ralat semasa log masuk. Sila sahkan maklumat anda.');
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
          <div className="mt-2 px-3 py-1 bg-blue-500/20 rounded-full">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Sutera Square Access</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="label-micro text-white/40">No. Lot (Unit)</label>
              <input 
                type="text" 
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-blue-500 transition-all font-mono text-lg"
                placeholder="Cth: A-01-01"
                required
              />
            </div>

            <div>
              <label className="label-micro text-white/40">No. Telefon</label>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-blue-500 transition-all font-mono text-lg"
                placeholder="Cth: 0123456789"
                required
              />
            </div>

            {lotNumber.toUpperCase() === 'ADMIN' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
              >
                <label className="label-micro text-red-500">Master Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-red-500/20 rounded-xl p-4 outline-none focus:border-red-500 transition-all"
                  placeholder="ADMIN123"
                />
              </motion.div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={cn(
              "w-full h-14 bg-white text-black rounded-full font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50",
              isSubmitting && "animate-pulse"
            )}
          >
            {isSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            {isSubmitting ? 'Mengesahkan Maklumat...' : 'Log Masuk Identiti'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">Hardware Secured • Cloud Synchronized</p>
        </div>
      </div>
    </motion.div>
  );
}
