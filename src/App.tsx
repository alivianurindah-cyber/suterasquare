/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Zap, 
  Droplet, 
  History, 
  Settings, 
  ShieldCheck, 
  LogOut,
  Camera,
  AlertCircle,
  CheckCircle2,
  Send,
  User as UserIcon,
  Search
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Scanner from './components/Scanner';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type View = 'login' | 'dashboard' | 'scanner' | 'admin' | 'history';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'water' | 'electric' | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u);
          await fetchProfile(u.uid);
        } else {
          setUser(null);
          setProfile(null);
          setCurrentView('login');
        }
      } catch (err) {
        console.error("Auth state error:", err);
        setError("Gagal memuat profil pengguna. Sila cuba lagi.");
      } finally {
        setIsLoading(false);
      }
    });
    return unsub;
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        if (data.role === 'admin') {
          // Keep current view or allow admin access
        }
        setCurrentView('dashboard');
      } else {
        setCurrentView('login');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  };

  const handleLoginSuccess = (p: any) => {
    setProfile(p);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#151619] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-red-500 w-16 h-16 mb-4" />
        <h2 className="text-white text-xl font-bold mb-2">Ralat Konfigurasi</h2>
        <p className="text-white/60 mb-6 max-w-xs">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary px-8"
        >
          Muat Semula
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#151619] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Activity className="text-white w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E6E6E6] font-sans text-[#141414] overflow-x-hidden">
      <AnimatePresence mode="wait">
        {!user || currentView === 'login' ? (
          <div key="login">
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        ) : currentView === 'scanner' ? (
          <div key="scanner" className="h-full">
            <Scanner 
              meterType={scanType!} 
              profile={profile}
              onBack={() => setCurrentView('dashboard')} 
            />
          </div>
        ) : currentView === 'admin' ? (
          <div key="admin">
            <AdminDashboard onBack={() => setCurrentView('dashboard')} />
          </div>
        ) : (
          <div key="dashboard">
            <Dashboard 
              profile={profile} 
              onScan={(type) => {
                setScanType(type);
                setCurrentView('scanner');
              }}
              onViewAdmin={() => setCurrentView('admin')}
              onLogout={handleLogout}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
