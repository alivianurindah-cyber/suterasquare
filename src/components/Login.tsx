import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Activity, Lock, User, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { cn } from '../App';

interface LoginProps {
  onLoginSuccess: (profile: any) => void;
}

type LoginTab = 'user' | 'admin';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [activeTab, setActiveTab] = useState<LoginTab>('user');
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
      // 1. Check for Admin credentials first if in admin tab
      if (activeTab === 'admin') {
        if (lotNumber.toUpperCase() !== 'ADMIN' || password !== 'ADMIN123') {
          throw new Error('Kredensial Pentadbir tidak sah.');
        }
      }

      // 2. Sign in Anonymously
      const authResult = await signInAnonymously(auth);
      const uid = authResult.user.uid;

      // 3. Prepare role
      const role = activeTab === 'admin' ? 'admin' : 'user';

      // 4. Search for existing profile with this lot + phone (for users)
      let profileData: any = null;

      if (activeTab === 'user') {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('lotNumber', '==', lotNumber.trim()), 
          where('phoneNumber', '==', phoneNumber.trim())
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          profileData = querySnapshot.docs[0].data();
        }
      }

      if (!profileData) {
        // New Registration or Admin
        profileData = {
          lotNumber: lotNumber.trim(),
          phoneNumber: activeTab === 'user' ? phoneNumber.trim() : 'ADMIN',
          role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
      }

      // 5. CRITICAL: Save/Sync the profile to the current UID to avoid race condition in App.tsx
      await setDoc(doc(db, 'users', uid), profileData);

      onLoginSuccess(profileData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ralat semasa log masuk. Sila sahkan maklumat anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-4 bg-[#151619]"
    >
      <div className="w-full max-w-md bg-[#1c1d22] rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full" />

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20"
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-black text-white tracking-tight">METERREADER <span className="text-blue-400">PRO</span></h1>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold mt-1">Sutera Square System</p>
          </div>

          {/* Tab Selection */}
          <div className="flex p-1 bg-white/5 rounded-xl mb-8">
            <button 
              onClick={() => setActiveTab('user')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'user' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              <User className="w-3.5 h-3.5" /> Pengguna
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'admin' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              <SettingsIcon className="w-3.5 h-3.5" /> Pentadbir
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              {activeTab === 'user' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">No. Lot (Unit)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-white/20 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      value={lotNumber}
                      onChange={(e) => setLotNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-mono text-white"
                      placeholder="Cth: A-01-01"
                      required={activeTab === 'user'}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'user' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1.5"
                >
                  <label className="text-[10px] uppercase tracking-widest font-black text-white/30 ml-1">No. Telefon</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Activity className="w-4 h-4 text-white/20 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                      type="tel" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-mono text-white"
                      placeholder="Cth: 0123456789"
                      required={activeTab === 'user'}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'admin' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1.5"
                >
                  <label className="text-[10px] uppercase tracking-widest font-black text-red-500/50 ml-1">Kata Laluan Pentadbir</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-white/20 group-focus-within:text-red-500 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 outline-none focus:border-red-500/50 focus:bg-white/10 transition-all text-white"
                      placeholder="Masukkan Kata Laluan"
                      required={activeTab === 'admin'}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center"
              >
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className={cn(
                "w-full h-14 bg-white text-black rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none group",
                activeTab === 'admin' ? "bg-red-500 text-white hover:bg-red-600" : "",
                isSubmitting && "animate-pulse"
              )}
            >
              {isSubmitting ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Log Masuk <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center opacity-30">
            <span className="text-[8px] font-bold uppercase tracking-widest text-white">v3.5.0 STABLE</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-white">ENCRYPTED SESSION</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

