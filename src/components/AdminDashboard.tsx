import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Search, 
  Trash2, 
  Filter, 
  Download,
  AlertCircle
} from 'lucide-react';
import { cn } from '../App';
import { calculateElectricity, calculateWater } from '../services/billing';

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'readings' | 'users'>('readings');
  const [readings, setReadings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'readings') {
      fetchReadings();
    } else {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchReadings = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'readings'), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      setReadings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Adakah anda pasti untuk memadam rekod ini secara kekal?')) return;
    try {
      await deleteDoc(doc(db, 'readings', id));
      setReadings(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert('Gagal memadam.');
    }
  };

  const calculateStats = () => {
    const totalWater = readings.filter(r => r.meterType === 'water').reduce((acc, curr) => acc + (curr.netUsage || 0), 0);
    const totalElectric = readings.filter(r => r.meterType === 'electric').reduce((acc, curr) => acc + (curr.netUsage || 0), 0);
    const totalRevenue = readings.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    return { totalWater, totalElectric, totalRevenue };
  };

  const stats = calculateStats();

  const filteredReadings = readings.filter(r => 
    r.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-[#F5F5F7] p-4 md:p-12 pt-24"
    >
      <div className="max-w-6xl mx-auto">
        {/* Admin Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-3 bg-white shadow-sm hover:bg-black hover:text-white rounded-full transition-all">
                <ArrowLeft className="w-6 h-6" />
             </button>
             <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  <label className="label-micro text-red-600 font-black">Master Controller v3</label>
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Sutera Square HQ</h1>
             </div>
          </div>
          
          <div className="flex bg-white p-1 rounded-full shadow-sm border border-black/5">
             <button 
              onClick={() => setActiveTab('readings')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold transition-all",
                activeTab === 'readings' ? "bg-black text-white" : "text-black/40 hover:text-black"
              )}
             >
               Bacaan Meter
             </button>
             <button 
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold transition-all",
                activeTab === 'users' ? "bg-black text-white" : "text-black/40 hover:text-black"
              )}
             >
               Pengguna
             </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
              <label className="label-micro text-blue-500">Jumlah Air Keseluruhan</label>
              <div className="flex items-baseline gap-2 mt-1">
                 <span className="text-3xl font-mono font-bold">{stats.totalWater.toFixed(1)}</span>
                 <span className="text-xs font-bold text-black/30">m³</span>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
              <label className="label-micro text-yellow-600">Jumlah Elektrik Keseluruhan</label>
              <div className="flex items-baseline gap-2 mt-1">
                 <span className="text-3xl font-mono font-bold">{stats.totalElectric.toFixed(1)}</span>
                 <span className="text-xs font-bold text-black/30">kWh</span>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm bg-black text-white">
              <label className="label-micro text-white/40">Anggaran Kutipan (RM)</label>
              <div className="flex items-baseline gap-2 mt-1">
                 <span className="text-3xl font-mono font-bold text-green-400">RM {stats.totalRevenue.toLocaleString()}</span>
              </div>
           </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-black/5">
          <div className="p-8 border-b border-black/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/30">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                <input 
                  type="text" 
                  placeholder={activeTab === 'readings' ? "Cari No. Lot..." : "Cari Lot atau Telefon..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-black transition-all shadow-inner"
                />
             </div>
             <button onClick={activeTab === 'readings' ? fetchReadings : fetchUsers} className="flex items-center gap-2 px-6 py-3 bg-white border border-black/10 rounded-2xl hover:bg-gray-50 font-bold text-xs uppercase tracking-widest">
                <Filter className="w-4 h-4" /> Segarkan Data
             </button>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'readings' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 label-micro text-black/40 border-b border-black/5 font-black">
                    <th className="p-6 pl-10">Maklumat Bacaan</th>
                    <th className="p-6">Unit Lot</th>
                    <th className="p-6">Data Deteksi AI</th>
                    <th className="p-6 text-right">Kos Bil (RM)</th>
                    <th className="p-6 pr-10 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="p-10 h-12 bg-gray-50" />
                      </tr>
                    ))
                  ) : filteredReadings.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-6 pl-10">
                        <div className="text-sm font-bold text-black/80">{new Date(r.timestamp?.toDate()).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[10px] font-mono text-black/40">{new Date(r.timestamp?.toDate()).toLocaleTimeString()}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-xl font-black">{r.lotNumber}</div>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
                          r.meterType === 'water' ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-black'
                        )}>
                          {r.meterType}
                        </span>
                      </td>
                      <td className="p-6 font-mono">
                        <div className="text-lg font-bold">{r.readingValue}</div>
                        <div className="text-[10px] text-black/40">Net: {r.netUsage.toFixed(2)}</div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="font-black text-2xl text-green-600">RM {r.totalCost.toFixed(2)}</div>
                        <div className="text-[9px] text-black/40 uppercase font-bold text-right flex flex-col">
                          {r.meterType === 'electric' ? (
                            <>
                              <span>Caj: RM {calculateElectricity(r.netUsage).currentCharge.toFixed(2)}</span>
                              <span>ICPT: RM {calculateElectricity(r.netUsage).icpt.toFixed(2)}</span>
                              <span>KWTBB: RM {calculateElectricity(r.netUsage).kwtbb.toFixed(2)}</span>
                            </>
                          ) : (
                            <>
                              <span>Asas: RM {calculateWater(r.netUsage).baseCost.toFixed(2)}</span>
                              <span>Diskaun: RM {calculateWater(r.netUsage).totalDiscount.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-6 pr-10 text-center">
                        <div className="flex justify-center gap-2">
                           <button className="p-2 bg-gray-100 rounded-lg hover:bg-black hover:text-white transition-colors" title="Lihat Metadata">
                              <Download className="w-4 h-4" />
                           </button>
                           <button 
                            onClick={() => handleDelete(r.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 label-micro text-black/40 border-b border-black/5 font-black">
                    <th className="p-6 pl-10">Pendaftaran</th>
                    <th className="p-6">No. Lot</th>
                    <th className="p-6">No. Telefon</th>
                    <th className="p-6">Role</th>
                    <th className="p-6 pr-10">ID Auth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="p-10 h-12 bg-gray-50" />
                      </tr>
                    ))
                  ) : filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-6 pl-10 text-sm font-medium">
                        {u.createdAt ? new Date(u.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-6 font-black text-lg">{u.lotNumber}</td>
                      <td className="p-6 font-mono">{u.phoneNumber}</td>
                      <td className="p-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                          u.role === 'admin' ? "bg-red-100 text-red-700 border border-red-200" : "bg-gray-100 text-black border border-black/10"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-6 pr-10 font-mono text-[10px] text-black/30 truncate max-w-[150px]">
                        {u.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Admin Footer Information */}
        <div className="mt-12 p-8 bg-black rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                 <ShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                 <h4 className="text-xl font-bold">Integriti Berasaskan AI</h4>
                 <p className="text-white/40 text-sm">Sistem ini memantau setiap baris data menggunakan "Double-Check Verification" dan Geo-Tagging.</p>
              </div>
           </div>
           <div className="flex gap-4">
              <button className="px-8 py-3 bg-blue-600 rounded-full font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">Eksport Laporan Bulanan</button>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
