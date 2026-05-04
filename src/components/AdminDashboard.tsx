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

interface AdminDashboardProps {
  onBack: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [readings, setReadings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'readings'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      setReadings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Adakah anda pasti untuk memadam rekod ini?')) return;
    try {
      await deleteDoc(doc(db, 'readings', id));
      setReadings(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert('Gagal memadam.');
    }
  };

  const filteredReadings = readings.filter(r => 
    r.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.meterType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-[#F5F5F7] p-4 md:p-12 pt-24"
    >
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-full">
                <ArrowLeft className="w-6 h-6" />
             </button>
             <div>
                <label className="label-micro text-red-500 font-bold">Admin Panel</label>
                <h1 className="text-4xl font-bold tracking-tight">Sutera Square Control</h1>
             </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                <input 
                  type="text" 
                  placeholder="Cari No. Lot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-full py-2 pl-10 pr-4 outline-none focus:border-black transition-colors"
                />
             </div>
             <button onClick={fetchReadings} className="p-2 bg-white border border-black/10 rounded-full hover:bg-gray-50">
                <Filter className="w-5 h-5" />
             </button>
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-black/5">
          <div className="p-6 border-b border-black/5 bg-gray-50/50 flex items-center justify-between">
             <h2 className="font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" /> Semua Rekod Bacaan
             </h2>
             <span className="px-3 py-1 bg-black text-white text-[10px] font-bold rounded-full">LIVE DATA</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 label-micro text-black/40 border-b border-black/5">
                  <th className="p-4 pl-8">Masa/Tarikh</th>
                  <th className="p-4">No. Lot</th>
                  <th className="p-4">Jenis</th>
                  <th className="p-4">Bacaan</th>
                  <th className="p-4 text-right">Kos (RM)</th>
                  <th className="p-4 pr-8 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="p-8 h-12 bg-gray-100/50" />
                    </tr>
                  ))
                ) : filteredReadings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-black/20 italic">Tiada rekod dijumpai</td>
                  </tr>
                ) : (
                  filteredReadings.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4 pl-8">
                         <div className="text-sm font-medium">
                            {new Date(r.timestamp?.toDate()).toLocaleDateString('ms-MY')}
                         </div>
                         <div className="text-[10px] text-black/40 font-mono">
                            {new Date(r.timestamp?.toDate()).toLocaleTimeString('ms-MY')}
                         </div>
                      </td>
                      <td className="p-4 font-bold text-lg">{r.lotNumber}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          r.meterType === 'water' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        )}>
                          {r.meterType}
                        </span>
                      </td>
                      <td className="p-4 font-mono">
                        {r.readingValue} <span className="text-[10px] text-black/40">{r.meterType === 'water' ? 'm³' : 'kWh'}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-green-600">RM {r.totalCost.toFixed(2)}</td>
                      <td className="p-4 pr-8 text-center">
                        <button 
                          onClick={() => handleDelete(r.id)}
                          className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
           <AlertCircle className="w-6 h-6 text-blue-500 mt-1" />
           <div>
              <h4 className="font-bold text-blue-900">Nota Integriti</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                Data dipaparkan di sini adalah bacaan yang telah disahkan oleh pengguna melalui Lensa AI Extreme. 
                Koordinat GPS dan timestamp server digunakan sebagai bukti sah untuk audit pengurusan.
              </p>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
