import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Zap, 
  Droplet, 
  History, 
  LogOut, 
  Plus, 
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { calculateElectricity, calculateWater } from '../services/billing';
import { cn } from '../App';

interface DashboardProps {
  profile: any;
  onScan: (type: 'water' | 'electric') => void;
  onViewAdmin: () => void;
  onLogout: () => void;
}

export default function Dashboard({ profile, onScan, onViewAdmin, onLogout }: DashboardProps) {
  const [recentReadings, setRecentReadings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showElectricDetails, setShowElectricDetails] = useState(false);
  const [showWaterDetails, setShowWaterDetails] = useState(false);

  useEffect(() => {
    fetchLatestReadings();
  }, [profile.lotNumber]);

  const fetchLatestReadings = async () => {
    try {
      const readingsRef = collection(db, 'readings');
      const q = query(
        readingsRef, 
        where('lotNumber', '==', profile.lotNumber),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      setRecentReadings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUsageSummary = (type: 'water' | 'electric') => {
    const last = recentReadings.find(r => r.meterType === type);
    if (!last) return { usage: 'N/A', cost: 'N/A', breakdown: null };
    
    let breakdown = null;
    if (type === 'electric') {
      breakdown = calculateElectricity(last.netUsage);
    } else {
      breakdown = calculateWater(last.netUsage);
    }

    return { 
      usage: last.netUsage.toFixed(2), 
      cost: last.totalCost.toFixed(2),
      unit: type === 'water' ? 'm³' : 'kWh',
      breakdown
    };
  };

  const electricSummary = getUsageSummary('electric');
  const waterSummary = getUsageSummary('water');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 md:p-8 pt-12"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <label className="label-micro text-black/40">Selamat Datang</label>
          <h1 className="text-4xl font-bold tracking-tight">Lot {profile.lotNumber}</h1>
          <p className="text-black/60 font-mono text-sm">{profile.phoneNumber}</p>
        </div>
        <div className="flex gap-2">
          {profile.role === 'admin' && (
            <button onClick={onViewAdmin} className="btn-secondary flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Panel Admin
            </button>
          )}
          <button onClick={onLogout} className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Action Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="flex flex-col gap-4">
          <motion.div 
            whileHover={{ y: -5 }}
            className="card-hardware p-8 flex flex-col items-start gap-4 text-left group relative overflow-hidden"
          >
            <div onClick={() => onScan('electric')} className="absolute inset-0 z-0" />
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center relative z-10">
              <Zap className="text-yellow-500 w-6 h-6" />
            </div>
            <div className="w-full relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">Meter Elektrik</h3>
                  <p className="text-white/40 text-sm mb-4">Mula imbasan AI Lensa Elektrik</p>
                </div>
                {electricSummary.breakdown && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowElectricDetails(!showElectricDetails); }}
                    className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 relative z-20"
                  >
                    {showElectricDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="data-value text-yellow-500">{electricSummary.usage}</span>
                <span className="label-micro uppercase">{electricSummary.unit}</span>
              </div>
              <p className="text-white/60 text-xs mt-1">Anggaran: RM {electricSummary.cost}</p>
              
              {showElectricDetails && electricSummary.breakdown && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-6 pt-4 border-t border-white/10 space-y-2"
                >
                  <div className="flex justify-between text-[10px] uppercase tracking-wider">
                    <span className="text-white/40">Caj Semasa</span>
                    <span className="text-white">RM {electricSummary.breakdown.currentCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-wider">
                    <span className="text-white/40">ICPT</span>
                    <span className="text-white">RM {electricSummary.breakdown.icpt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-wider">
                    <span className="text-white/40">KWTBB (1.6%)</span>
                    <span className="text-white">RM {electricSummary.breakdown.kwtbb.toFixed(2)}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col gap-4">
          <motion.div 
            whileHover={{ y: -5 }}
            className="card-hardware p-8 flex flex-col items-start gap-4 text-left group relative overflow-hidden"
          >
            <div onClick={() => onScan('water')} className="absolute inset-0 z-0" />
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Droplet className="w-24 h-24" />
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center relative z-10">
              <Droplet className="text-blue-500 w-6 h-6" />
            </div>
            <div className="w-full relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">Meter Air</h3>
                  <p className="text-white/40 text-sm mb-4">Mula imbasan AI Lensa Air</p>
                </div>
                {waterSummary.breakdown && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowWaterDetails(!showWaterDetails); }}
                    className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 relative z-20"
                  >
                    {showWaterDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="data-value text-blue-500">{waterSummary.usage}</span>
                <span className="label-micro uppercase">{waterSummary.unit}</span>
              </div>
              <p className="text-white/60 text-xs mt-1">Anggaran: RM {waterSummary.cost}</p>

              {showWaterDetails && waterSummary.breakdown && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-6 pt-4 border-t border-white/10 space-y-2"
                >
                  <div className="flex justify-between text-[10px] uppercase tracking-wider">
                    <span className="text-white/40">Kos Asas</span>
                    <span className="text-white">RM {waterSummary.breakdown.baseCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-wider">
                    <span className="text-white/40">Diskaun Lot</span>
                    <span className="text-red-400">- RM {waterSummary.breakdown.totalDiscount.toFixed(2)}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-black/40" /> Sejarah Imbasan
          </h2>
          <span className="label-micro text-black/40">5 Terkini</span>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-black/20 italic">Memuatkan data...</div>
          ) : recentReadings.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-black/20 italic border-2 border-dashed border-black/5 rounded-xl">Tiada rekod lagi</div>
          ) : (
            recentReadings.map((reading) => (
              <div key={reading.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-lg",
                    reading.meterType === 'water' ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-600"
                  )}>
                    {reading.meterType === 'water' ? <Droplet className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold uppercase text-xs tracking-wider">{reading.meterType}</p>
                    <p className="text-sm text-black/40">{new Date(reading.timestamp.toDate()).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold">{reading.netUsage.toFixed(2)} {reading.meterType === 'water' ? 'm³' : 'kWh'}</p>
                  <p className="text-xs text-green-600 font-bold">RM {reading.totalCost.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <footer className="mt-12 text-center text-black/20">
        <p className="text-[10px] uppercase tracking-widest">Sutera Square Pro Management V3.0.0 Extreme</p>
      </footer>
    </motion.div>
  );
}
