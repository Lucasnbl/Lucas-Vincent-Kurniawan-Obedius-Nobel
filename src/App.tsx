import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  SlidersHorizontal, 
  Layers, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Info, 
  Scale, 
  HelpCircle,
  Sun,
  Moon,
  Coffee as CoffeeIcon,
  Cookie,
  RefreshCw,
  BookOpen,
  MapPin,
  Building,
  Target,
  DollarSign,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { ThemeType, Criterion, Alternative } from './types';
import { calculateTOPSIS, calculateWASPAS, calculateCombined } from './utils/math';
import { INITIAL_ALTERNATIVES } from './data/rukoDataset';

// 6 criteria defined in the prompt for strategically expanding business via Ruko expansion
const CRITERIA: Criterion[] = [
  { id: 'C1', code: 'C1', name: 'Biaya Sewa Tahunan', type: 'cost', description: 'Biaya sewa ruko tahunan (dalam Juta Rupiah). Semakin kecil biaya sewa, semakin bagus untuk menghemat anggaran modal.' },
  { id: 'C2', code: 'C2', name: 'Kepadatan Lalu Lintas', type: 'benefit', description: 'Skala kepadatan pejalan kaki & kendaraan harian (skala 1-100). Lebih padat memperbesar tingkat konversi pengunjung masuk toko.' },
  { id: 'C3', code: 'C3', name: 'Kedekatan Pusat Kota', type: 'benefit', description: 'Konektivitas dan kedekatan lokasi menuju pusat kota / sentra bisnis (skala 1-5, skor 5 berarti sangat dekat/strategis).' },
  { id: 'C4', code: 'C4', name: 'Keamanan Lingkungan', type: 'benefit', description: 'Tingkat keamanan lingkungan dari kemalingan, premanisme, sengketa lahan, dll (skala 1-5, 5 berarti sangat aman & damai).' },
  { id: 'C5', code: 'C5', name: 'Jumlah Kompetitor Sekitar', type: 'cost', description: 'Kepadatan kompetitor bidang usaha serupa dalam radius 1 Km (Unit). Semakin sedikit kompetitor sejenis, ruang pasar terbuka lebih besar.' },
  { id: 'C6', code: 'C6', name: 'Potensi Ekonomi Warga', type: 'benefit', description: 'Daya beli dan tingkat penghasilan rata-rata populasi warga di wilayah sekitar ruko (skala 1-5, skor 5 menggambarkan kelas ekonomi tinggi).' }
];

// Initial direct weights scale 1-10
const INITIAL_WEIGHTS: { [key: string]: number } = {
  C1: 5,  // Biaya Sewa Tahunan
  C2: 8,  // Kepadatan Lalu Lintas
  C3: 6,  // Kedekatan Pusat Kota
  C4: 5,  // Keamanan Lingkungan
  C5: 4,  // Jumlah Kompetitor Sekitar
  C6: 7   // Potensi Ekonomi Warga
};

export default function App() {
  const [theme, setTheme] = useState<ThemeType>('Light');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alternatives' | 'weights' | 'math'>('dashboard');
  
  // WASPAS parameter lambda (configurable by user)
  const [lambda, setLambda] = useState<number>(0.5);

  // Alternative locations state
  const [alternatives, setAlternatives] = useState<Alternative[]>(INITIAL_ALTERNATIVES);
  
  // Custom new candidate input states
  const [newAltName, setNewAltName] = useState('');
  const [newAltScores, setNewAltScores] = useState({
    C1: 100, C2: 60, C3: 3, C4: 3, C5: 5, C6: 3
  });

  // Direct weight state (scale 1 to 10 for each criterion)
  const [directWeights, setDirectWeights] = useState<{ [key: string]: number }>(INITIAL_WEIGHTS);

  // Vector sum normalization calculation to yield weights that add up to exactly 1.0 (vector W_j)
  const normalizedWeights = useMemo(() => {
    const valuesArray = Object.values(directWeights) as number[];
    const total = valuesArray.reduce((sum, val) => sum + val, 0);
    return CRITERIA.map(c => {
      const wVal = directWeights[c.id] || 1;
      return total > 0 ? wVal / total : 1 / CRITERIA.length;
    });
  }, [directWeights]);

  // Calculate TOPSIS based on current normalized weights
  const topsisResult = useMemo(() => {
    return calculateTOPSIS(alternatives, normalizedWeights, CRITERIA);
  }, [alternatives, normalizedWeights]);

  // Calculate WASPAS using normalized weights
  const waspasResult = useMemo(() => {
    return calculateWASPAS(alternatives, normalizedWeights, CRITERIA, lambda);
  }, [alternatives, normalizedWeights, lambda]);

  // Combine TOPSIS & WASPAS rankings for maximum accuracy
  const combinedResult = useMemo(() => {
    return calculateCombined(topsisResult.results, waspasResult.results);
  }, [topsisResult.results, waspasResult.results]);

  // Reset to initial settings helper
  const handleReset = () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan seluruh parameter data dan pembobotan ke konfigurasi default?')) {
      setAlternatives(INITIAL_ALTERNATIVES);
      setDirectWeights(INITIAL_WEIGHTS);
      setLambda(0.5);
    }
  };

  // Add new alternative location
  const handleAddAlternative = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAltName.trim()) {
      alert('Nama ruko / lokasi harus diisi!');
      return;
    }
    const newAlt: Alternative = {
      id: `alt-${Date.now()}`,
      name: newAltName.trim(),
      scores: { ...newAltScores }
    };
    setAlternatives([...alternatives, newAlt]);
    setNewAltName('');
    setNewAltScores({ C1: 100, C2: 60, C3: 3, C4: 3, C5: 5, C6: 3 });
  };

  // Delete alternative channel
  const handleDeleteAlternative = (id: string) => {
    if (alternatives.length <= 2) {
      alert('Minimal harus menyisakan 2 alternatif lokasi agar perhitungan ranking TOPSIS dan WASPAS berjalan dengan valid.');
      return;
    }
    setAlternatives(alternatives.filter(alt => alt.id !== id));
  };

  // Handle local cell scores change directly
  const handleScoreChange = (altId: string, criterionId: keyof Alternative['scores'], val: number) => {
    // Avoid range/type errors
    let formattedVal = isNaN(val) ? 0 : val;
    if (formattedVal < 0) formattedVal = 0;

    setAlternatives(prev => prev.map(alt => {
      if (alt.id === altId) {
        return {
          ...alt,
          scores: {
            ...alt.scores,
            [criterionId]: formattedVal
          }
        };
      }
      return alt;
    }));
  };



  // Best Champion candidate node
  const bestAlternative = useMemo(() => {
    if (combinedResult.length === 0) return null;
    // The top rank in our combined result list
    const first = [...combinedResult].sort((a, b) => a.finalRank - b.finalRank)[0];
    return {
      ...first,
      // Find original scores
      scores: alternatives.find(alt => alt.id === first.alternativeId)?.scores
    };
  }, [combinedResult, alternatives]);

  // Dynamic Theme Styling Objects
  const themeStyles = {
    Light: {
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      textMuted: 'text-slate-500',
      banner: 'bg-white border-slate-200 shadow-xs',
      card: 'bg-white border border-slate-200/80 shadow-xs rounded-2xl p-6',
      badgeActive: 'bg-indigo-600 text-white',
      badgeInactive: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
      tabBorder: 'border-b border-slate-200',
      input: 'bg-slate-100/90 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden',
      tableHeader: 'bg-slate-50 text-slate-500 font-bold border-b border-slate-200',
      tableCell: 'border-b border-slate-100 hover:bg-slate-50/50',
      header: 'bg-white border-b border-slate-200',
      accentText: 'text-indigo-600',
      progressBg: 'bg-slate-100',
      progressBar: 'bg-indigo-600',
      footer: 'bg-white border-t border-slate-200',
      sliderTrack: 'accent-indigo-600',
      accentBadge: 'bg-indigo-500/10 text-indigo-600'
    },
    Dark: {
      bg: 'bg-slate-950',
      text: 'text-slate-100',
      textMuted: 'text-slate-400',
      banner: 'bg-slate-900 border-slate-800 shadow-md',
      card: 'bg-slate-900 border border-slate-800 shadow-lg rounded-2xl p-6',
      badgeActive: 'bg-blue-600 text-white',
      badgeInactive: 'bg-slate-800 hover:bg-slate-700 text-slate-300',
      tabBorder: 'border-b border-slate-800',
      input: 'bg-slate-800 border border-slate-700 text-slate-100 focus:border-blue-500 focus:bg-slate-850 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20',
      tableHeader: 'bg-slate-900/50 text-slate-400 font-bold border-b border-slate-800',
      tableCell: 'border-b border-slate-800/80 hover:bg-slate-900/40',
      header: 'bg-slate-900 border-b border-slate-800',
      accentText: 'text-blue-400',
      progressBg: 'bg-slate-850',
      progressBar: 'bg-blue-500',
      footer: 'bg-slate-900 border-t border-slate-800',
      sliderTrack: 'accent-blue-500',
      accentBadge: 'bg-blue-500/10 text-blue-400'
    },
    Coffee: {
      bg: 'bg-[#fbf4eb]',
      text: 'text-amber-950',
      textMuted: 'text-[#8c7462]',
      banner: 'bg-[#f4ebd9] border-[#eacfaf] shadow-xs',
      card: 'bg-[#f5ebd6] border border-[#e6ccb2] shadow-xs rounded-2xl p-6',
      badgeActive: 'bg-[#8c6239] text-[#fdfefd]',
      badgeInactive: 'bg-[#ebd9c1] hover:bg-[#dfc4a5] text-amber-950',
      tabBorder: 'border-b border-[#e3ceb6]',
      input: 'bg-[#faf3e7] border border-[#dfc4a5] text-amber-950 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#8c6239]/20',
      tableHeader: 'bg-[#eedebf] text-[#6b4c35] font-bold border-b border-[#dfc4a5]',
      tableCell: 'border-b border-[#efe2ca] hover:bg-[#eedfc4]/30',
      header: 'bg-[#f5ebd6] border-b border-[#dfc4a5]',
      accentText: 'text-[#a0522d]',
      progressBg: 'bg-[#ebd7bf]',
      progressBar: 'bg-[#8c6239]',
      footer: 'bg-[#f5ebd6] border-t border-[#dfc4a5]',
      sliderTrack: 'accent-[#8c6239]',
      accentBadge: 'bg-[#8c6239]/10 text-[#8c6239]'
    },
    Chocolate: {
      bg: 'bg-[#1b110c]',
      text: 'text-[#faebd7]',
      textMuted: 'text-[#a1897d]',
      banner: 'bg-[#2a1b15] border-[#3d271f] shadow-lg',
      card: 'bg-[#2d1f18] border border-[#422e23] shadow-lg rounded-2xl p-6',
      badgeActive: 'bg-[#d2691e] text-white',
      badgeInactive: 'bg-[#3b2b23] hover:bg-[#4d3a30] text-[#eed9cb]',
      tabBorder: 'border-b border-[#3d2a20]',
      input: 'bg-[#211611] border border-[#4a362c] text-[#f9ebdf] focus:border-[#d2691e] focus:outline-hidden focus:ring-2 focus:ring-[#d2691e]/20',
      tableHeader: 'bg-[#291b15] text-[#caa796] font-bold border-b border-[#422e23]',
      tableCell: 'border-b border-[#3b2a21]/50 hover:bg-[#34241d]',
      header: 'bg-[#291b15] border-b border-[#422e23]',
      accentText: 'text-[#e9743f]',
      progressBg: 'bg-[#261711]',
      progressBar: 'bg-[#d2691e]',
      footer: 'bg-[#291b15] border-t border-[#422e23]',
      sliderTrack: 'accent-[#d2691e]',
      accentBadge: 'bg-[#d2691e]/10 text-[#e9743f]'
    }
  }[theme];

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} transition-colors duration-200 font-sans flex flex-col`}>
      
      {/* Platform Header Navigation */}
      <header className={`sticky top-0 z-40 ${themeStyles.header} shadow-sm backdrop-blur-md bg-opacity-95`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${themeStyles.accentBadge}`}>
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                DecisRuko <span className="text-[10px] uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold ml-1.5 align-middle">TOPSIS-WASPAS</span>
              </h1>
              <p className={`text-xs ${themeStyles.textMuted}`}>Sistem Terintegrasi Pemilihan Ruko Ekspansi Penjualan Strategis</p>
            </div>
          </div>

          {/* Theme Selector Controls */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 p-1 rounded-xl ${theme === 'Dark' || theme === 'Chocolate' ? 'bg-slate-800' : 'bg-slate-100'} border border-slate-200/40`}>
              {(['Light', 'Dark', 'Coffee', 'Chocolate'] as ThemeType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  id={`btn-theme-${t.toLowerCase()}`}
                  className={`p-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer ${theme === t ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  title={`Tema ${t}`}
                >
                  {t === 'Light' && <Sun className="w-3.5 h-3.5" />}
                  {t === 'Dark' && <Moon className="w-3.5 h-3.5" />}
                  {t === 'Coffee' && <CoffeeIcon className="w-3.5 h-3.5" />}
                  {t === 'Chocolate' && <Cookie className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline text-[10px]">{t}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleReset}
              id="btn-reset-data"
              className="p-2 border border-rose-500/30 hover:border-rose-500 rounded-xl transition-all hover:bg-rose-50/10 text-rose-500 text-xs font-semibold cursor-pointer flex items-center gap-1"
              title="Kembalikan semua nilai ke kondisi awal"
            >
              <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Navigation Tabs Bar */}
        <div className={`flex items-center gap-1 ${themeStyles.tabBorder} pb-px overflow-x-auto whitespace-nowrap scrollbar-none`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            id="tab-nav-dashboard"
            className={`px-4 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'dashboard' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard Rekomendasi
          </button>
          <button
            onClick={() => setActiveTab('alternatives')}
            id="tab-nav-alternatives"
            className={`px-4 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'alternatives' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <Settings className="w-4 h-4" /> Evaluasi Alternatif Ruko
          </button>
          <button
            onClick={() => setActiveTab('weights')}
            id="tab-nav-weights"
            className={`px-4 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'weights' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Pengaturan Bobot Kriteria
          </button>
          <button
            onClick={() => setActiveTab('math')}
            id="tab-nav-math"
            className={`px-4 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'math' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <Layers className="w-4 h-4" /> Transparansi Perhitungan
          </button>
        </div>

        {/* Tab Viewport Body wrapper */}
        <div className="flex-grow">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: RESULT DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="tab-dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                
                {/* Ranking Table card & Visual preferences */}
                <div className={`col-span-1 lg:col-span-2 ${themeStyles.card} flex flex-col gap-6`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" /> Pemeringkatan Lokasi Terbaik (Combined Index)
                      </h3>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Kombinasi merata nilai preferensi TOPSIS (V_i) dan indeks WASPAS (Q_i) untuk kestabilan keputusan tertinggi.</p>
                    </div>

                    {/* Quick setting for WASPAS Lambda */}
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-500/5 border border-slate-200/10 text-xs">
                      <span className="font-semibold text-[11px]" title="Parameter Lambda menentukan porsi WSM vs WPM. Nilai 0.5 adalah seimbang.">
                        WASPAS Limit (Lambda): <strong className="font-mono text-indigo-500">{lambda.toFixed(2)}</strong>
                      </span>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={lambda}
                        onChange={(e) => setLambda(parseFloat(e.target.value))}
                        className={`w-20 h-1 rounded-lg cursor-pointer ${themeStyles.sliderTrack}`}
                        title="Geser menentukan kontribusi WSM (penjumlahan) dan WPM (perkalian)"
                      />
                    </div>
                  </div>

                  {/* List of Locations sorted by combined result */}
                  <div className="flex flex-col gap-4">
                    {combinedResult
                      .sort((a, b) => a.finalRank - b.finalRank)
                      .map((result, idx) => {
                        const isRankFirst = idx === 0;
                        return (
                          <div 
                            key={result.alternativeId}
                            id={`rank-item-${result.alternativeId}`}
                            className={`p-5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-200 ${isRankFirst ? 'bg-indigo-500/10 border-indigo-500/40 relative overflow-hidden' : 'border-slate-200/50'}`}
                          >
                            {/* Backdrop Rank Number Accent */}
                            {isRankFirst && (
                              <div className="absolute right-0 top-0 text-7xl font-black text-indigo-500/5 select-none transform translate-x-3 -translate-y-3">1</div>
                            )}

                            {/* Info Location */}
                            <div className="flex items-center gap-3.5 z-10 w-full md:w-auto">
                              <span className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${isRankFirst ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-800'}`}>
                                {idx + 1}
                              </span>
                              <div className="truncate">
                                <h4 className="text-xs font-bold flex items-center gap-1.5 truncate">
                                  {result.name}
                                  {isRankFirst && <span className="bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Metode Hibrid Terbaik</span>}
                                </h4>
                                <p className={`text-[10px] ${themeStyles.textMuted} truncate mt-0.5`}>
                                  Hasil Skor Individu → <span className="font-semibold text-emerald-500">TOPSIS: {result.topsisPref.toFixed(4)} (Rank {result.topsisRank})</span> | <span className="font-semibold text-blue-500">WASPAS: {result.waspasScore.toFixed(4)} (Rank {result.waspasRank})</span>
                                </p>
                              </div>
                            </div>

                            {/* Preference score value representation */}
                            <div className="w-full md:w-64 flex flex-col gap-1.5 z-10">
                              <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className={themeStyles.textMuted}>Indeks Gabungan: <span className="font-mono text-xs">{result.combinedScore.toFixed(4)}</span></span>
                                <span>{(result.combinedScore * 100).toFixed(1)}%</span>
                              </div>
                              <div className={`h-2.5 w-full rounded-full ${themeStyles.progressBg} overflow-hidden shadow-inner`}>
                                <motion.div 
                                  className={`h-full rounded-full ${isRankFirst ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : themeStyles.progressBar}`} 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${result.combinedScore * 100}%` }}
                                  transition={{ delay: 0.1, duration: 0.5 }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Champion highlight side block */}
                <div className="flex flex-col gap-6">
                  
                  {/* Rekomendasi Utama Card */}
                  {bestAlternative && (
                    <div className={`${themeStyles.card} border-indigo-500/40 relative overflow-hidden flex flex-col gap-4 shadow-md`}>
                      <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500 animate-bounce" />
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Pilihan Ruko Optimal</span>
                      </div>

                      <div>
                        <h4 className="text-lg font-black tracking-tight">{bestAlternative.name}</h4>
                        <p className={`text-xs ${themeStyles.textMuted} mt-1 leading-relaxed`}>
                          Berdasarkan agregasi seluruh kriteria strategis, lokasi ini mendominasi keunggulan kombinasi biaya berbanding keramaian lalu lintas dan potensi transaksi belanja.
                        </p>
                      </div>

                      {/* Display location metrics key */}
                      <div className="border-t border-slate-200/40 pt-4 flex flex-col gap-3">
                        <p className="text-xs font-bold">Parameter Fisik Lokasi:</p>
                        {bestAlternative.scores && (
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2.5 rounded-lg bg-slate-500/5 border border-slate-200/10 flex flex-col">
                              <span className={themeStyles.textMuted}>Biaya Sewa (C1)</span>
                              <span className="font-mono font-bold text-rose-500 mt-0.5">{bestAlternative.scores.C1} JT/Thn</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-500/5 border border-slate-200/10 flex flex-col">
                              <span className={themeStyles.textMuted}>Lalu Lintas (C2)</span>
                              <span className="font-mono font-bold text-emerald-500 mt-0.5">{bestAlternative.scores.C2} / 100</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-500/5 border border-slate-200/10 flex flex-col">
                              <span className={themeStyles.textMuted}>Kompetitor (C5)</span>
                              <span className="font-mono font-bold text-orange-400 mt-0.5">{bestAlternative.scores.C5} Unit</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-500/5 border border-slate-200/10 flex flex-col">
                              <span className={themeStyles.textMuted}>Potensi Eko (C6)</span>
                              <span className="font-mono font-bold mt-0.5">{bestAlternative.scores.C6} / 5</span>
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-indigo-500 italic flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pilihan seimbang antara sewa minim vs konversi maksim.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Calculated Weight Distribution summary list */}
                  <div className={`${themeStyles.card} flex flex-col gap-4`}>
                    <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">Distribusi Bobot Sektoral</h4>
                    <p className={`text-[11px] ${themeStyles.textMuted}`}>Distribusi derajat kepentingan (%) kriteria ruko berdasarkan model pembobotan langsung:</p>
                    <div className="flex flex-col gap-3">
                      {CRITERIA.map((criterion, idx) => {
                        const weightPct = ((normalizedWeights[idx] || 0) * 100).toFixed(1);
                        return (
                          <div key={criterion.id} className="flex flex-col gap-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="truncate">{criterion.code} - {criterion.name}</span>
                              <span className="font-mono">{weightPct}%</span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full ${themeStyles.progressBg} overflow-hidden`}>
                              <div className={`h-full ${themeStyles.progressBar}`} style={{ width: `${weightPct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* TAB 2: MANAGE ALTERNATIVE RUNTIME DATA */}
            {activeTab === 'alternatives' && (
              <motion.div
                key="tab-alternatives"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6"
              >
                
                {/* Score Editing Table */}
                <div className={themeStyles.card}>
                  <div className="mb-6">
                    <h3 className="text-base font-bold">Matriks Keputusan Awal (X) &amp; Penilaian Ruko</h3>
                    <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Ubah angka sewa tahunan ruko (C1), traffic pejalan kaki (C2), kompetitor terdekat (C5) serta parameter subyektif lainnya. Hasil evaluasi matematis didepan otomatis sinkron.</p>
                  </div>

                  <div className="overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr>
                          <th className={`p-3 text-xs ${themeStyles.tableHeader}`}>Nama Kandidat Ruko</th>
                          <th className={`p-3 text-xs ${themeStyles.tableHeader} text-center`}>C1: Sewa (Juta/Th)<br/><span className="text-[10px] font-normal text-rose-500">Semakin Kecil Baik</span></th>
                          <th className={`p-3 text-xs ${themeStyles.tableHeader} text-center`}>C2: Lalu Lintas (1-100)<br/><span className="text-[10px] font-normal text-emerald-500">Semakin Besar Baik</span></th>
                          <th className={`p-3 text-xs ${themeStyles.tableHeader} text-center`}>C3: Dekat Kota (1-5)<br/><span className="text-[10px] font-normal text-emerald-500">Benefit</span></th>
                          <th className={`p-3 text-xs ${themeStyles.tableHeader} text-center`}>C4: Keamanan (1-5)<br/><span className="text-[10px] font-normal text-emerald-500">Benefit (Subj)</span></th>
                          <th className={`p-3 text-xs ${themeStyles.tableHeader} text-center`}>C5: Kompetitor (Unit)<br/><span className="text-[10px] font-normal text-rose-500">Semakin Kecil Baik</span></th>
                          <th className={`p-3 text-xs ${themeStyles.tableHeader} text-center`}>C6: Potensi Eko (1-5)<br/><span className="text-[10px] font-normal text-emerald-500">Benefit (Subj)</span></th>
                          <th className={`p-3 text-xs ${themeStyles.tableHeader} text-center`}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alternatives.map((alt) => (
                          <tr key={alt.id} id={`row-alt-${alt.id}`} className={themeStyles.tableCell}>
                            <td className="p-3 font-bold text-xs truncate max-w-[170px]" title={alt.name}>
                              {alt.name}
                            </td>
                            {/* Rent input (Cost) */}
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <input 
                                  id={`input-c1-${alt.id}`}
                                  type="number" 
                                  min="1" 
                                  max="5000"
                                  value={alt.scores.C1} 
                                  onChange={(e) => handleScoreChange(alt.id, 'C1', parseFloat(e.target.value) || 0)}
                                  className={`w-16 text-center text-xs p-1.5 rounded-lg ${themeStyles.input} font-mono font-bold`} 
                                />
                                <span className="text-[10px] text-slate-400 font-bold">jt</span>
                              </div>
                            </td>
                            {/* Traffic input (Benefit) */}
                            <td className="p-3 text-center">
                              <input 
                                id={`input-c2-${alt.id}`}
                                type="number" 
                                min="1" 
                                max="100"
                                value={alt.scores.C2} 
                                onChange={(e) => handleScoreChange(alt.id, 'C2', parseInt(e.target.value) || 0)}
                                className={`w-16 text-center text-xs p-1.5 rounded-lg ${themeStyles.input} font-mono font-bold`} 
                              />
                            </td>
                            {/* Proximity C3 (Benefit) */}
                            <td className="p-3 text-center">
                              <select
                                id={`select-c3-${alt.id}`}
                                value={alt.scores.C3}
                                onChange={(e) => handleScoreChange(alt.id, 'C3', parseInt(e.target.value))}
                                className={`text-xs p-1.5 rounded-lg ${themeStyles.input} font-bold cursor-pointer`}
                              >
                                {[1, 2, 3, 4, 5].map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </td>
                            {/* Security C4 (Benefit) */}
                            <td className="p-3 text-center">
                              <select
                                id={`select-c4-${alt.id}`}
                                value={alt.scores.C4}
                                onChange={(e) => handleScoreChange(alt.id, 'C4', parseInt(e.target.value))}
                                className={`text-xs p-1.5 rounded-lg ${themeStyles.input} font-bold cursor-pointer`}
                              >
                                {[1, 2, 3, 4, 5].map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </td>
                            {/* Competitors C5 (Cost) */}
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <input 
                                  id={`input-c5-${alt.id}`}
                                  type="number" 
                                  min="0" 
                                  max="200"
                                  value={alt.scores.C5} 
                                  onChange={(e) => handleScoreChange(alt.id, 'C5', parseInt(e.target.value) || 0)}
                                  className={`w-14 text-center text-xs p-1.5 rounded-lg ${themeStyles.input} font-mono font-bold`} 
                                />
                                <span className="text-[10px] text-slate-400 font-bold">unit</span>
                              </div>
                            </td>
                            {/* Potential C6 (Benefit) */}
                            <td className="p-3 text-center">
                              <select
                                id={`select-c6-${alt.id}`}
                                value={alt.scores.C6}
                                onChange={(e) => handleScoreChange(alt.id, 'C6', parseInt(e.target.value))}
                                className={`text-xs p-1.5 rounded-lg ${themeStyles.input} font-bold cursor-pointer`}
                              >
                                {[1, 2, 3, 4, 5].map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </td>
                            {/* Delete Button */}
                            <td className="p-3 text-center">
                              <button 
                                id={`btn-delete-${alt.id}`}
                                onClick={() => handleDeleteAlternative(alt.id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all cursor-pointer"
                                title={`Hapus ${alt.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Submit New Candidate Form */}
                <div className={themeStyles.card}>
                  <h3 className="text-base font-bold flex items-center gap-2 mb-1">
                    <Plus className="w-5 h-5 text-indigo-500" /> Tambah Kandidat Ruko / Lokasi Baru
                  </h3>
                  <p className={`text-xs ${themeStyles.textMuted} mb-5`}>Masukkan koordinat properti atau nama ruko bayangan yang sedang ditinjau untuk dievaluasi oleh sistem TOPSIS-WASPAS.</p>

                  <form onSubmit={handleAddAlternative} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                    <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-2">
                      <label id="lbl-new-name" className="text-[10px] font-bold text-slate-400 tracking-wider">NAMA RUKO / MODEL LOKASI</label>
                      <input 
                        id="new-alt-name-input"
                        type="text" 
                        placeholder="Misal: Ruko Kemang Corner, Ruko BSD"
                        value={newAltName}
                        onChange={(e) => setNewAltName(e.target.value)}
                        className={`p-2.5 text-xs rounded-xl ${themeStyles.input} font-semibold`}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider">C1: SEWA (JT/THN)</label>
                      <input 
                        id="new-alt-c1"
                        type="number" 
                        min="1" 
                        max="2000"
                        value={newAltScores.C1}
                        onChange={(e) => setNewAltScores({ ...newAltScores, C1: parseFloat(e.target.value) || 0 })}
                        className={`p-2.5 text-xs rounded-xl ${themeStyles.input} font-mono font-semibold`}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider">C2: LALU LINTAS (1-100)</label>
                      <input 
                        id="new-alt-c2"
                        type="number" 
                        min="1" 
                        max="100"
                        value={newAltScores.C2}
                        onChange={(e) => setNewAltScores({ ...newAltScores, C2: parseInt(e.target.value) || 0 })}
                        className={`p-2.5 text-xs rounded-xl ${themeStyles.input} font-mono font-semibold`}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider">C3: DEKAT KOTA (1-5)</label>
                      <select 
                        id="new-alt-c3"
                        value={newAltScores.C3}
                        onChange={(e) => setNewAltScores({ ...newAltScores, C3: parseInt(e.target.value) })}
                        className={`p-2.5 text-xs rounded-xl ${themeStyles.input} font-semibold cursor-pointer`}
                      >
                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider">C4: KEAMANAN (1-5)</label>
                      <select 
                        id="new-alt-c4"
                        value={newAltScores.C4}
                        onChange={(e) => setNewAltScores({ ...newAltScores, C4: parseInt(e.target.value) })}
                        className={`p-2.5 text-xs rounded-xl ${themeStyles.input} font-semibold cursor-pointer`}
                      >
                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider">C5: KOMPETITOR (UNIT)</label>
                      <input 
                        id="new-alt-c5"
                        type="number" 
                        min="0" 
                        max="100"
                        value={newAltScores.C5}
                        onChange={(e) => setNewAltScores({ ...newAltScores, C5: parseInt(e.target.value) || 0 })}
                        className={`p-2.5 text-xs rounded-xl ${themeStyles.input} font-mono font-semibold`}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider">C6: POTENSI EKO (1-5)</label>
                      <select 
                        id="new-alt-c6"
                        value={newAltScores.C6}
                        onChange={(e) => setNewAltScores({ ...newAltScores, C6: parseInt(e.target.value) })}
                        className={`p-2.5 text-xs rounded-xl ${themeStyles.input} font-semibold cursor-pointer`}
                      >
                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    <div className="sm:col-span-2 md:col-span-2 lg:col-span-1">
                      <button 
                        id="btn-submit-alternative"
                        type="submit"
                        className="w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-with-duration shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Simpan Ruko
                      </button>
                    </div>
                  </form>
                </div>

              </motion.div>
            )}

            {/* TAB 3: DIRECT WEIGHT ADJUSTMENT */}
            {activeTab === 'weights' && (
              <motion.div
                key="tab-weights"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                
                {/* Visual Direct Sliders Interface */}
                <div className={`col-span-1 lg:col-span-2 ${themeStyles.card} flex flex-col gap-6`}>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-1.5">
                      <SlidersHorizontal className="w-5 h-5 text-indigo-500" /> Pengaturan Bobot Kepentingan Kriteria
                    </h3>
                    <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Tentukan seberapa penting masing-masing kriteria secara langsung (Skala 1 - 10). Sistem akan secara otomatis menghitung nilai bobot ternormalisasi (W_j) yang setara dengan persentase kontribusi dalam pengambilan keputusan ruko.</p>
                  </div>

                  {/* Range Sliders List */}
                  <div className="flex flex-col gap-5 divide-y divide-slate-200/20">
                    {CRITERIA.map((crit, idx) => {
                      const scoreVal = directWeights[crit.id] || 1;
                      const percentage = (normalizedWeights[idx] * 100).toFixed(1);
                      return (
                        <div key={crit.id} id={`weight-slider-group-${crit.id}`} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} flex flex-col gap-2`}>
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-indigo-500 font-mono text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded-md">{crit.code}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{crit.name}</span>
                              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${crit.type === 'benefit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {crit.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className={themeStyles.textMuted}>Skor: <strong className="text-slate-850 dark:text-slate-100 font-bold">{scoreVal}</strong></span>
                              <span className="text-indigo-500 font-bold">({percentage}%)</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-400 w-12 text-right">Rendah</span>
                            <input 
                              id={`slider-weight-${crit.id}`}
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={scoreVal}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value);
                                setDirectWeights(prev => ({ ...prev, [crit.id]: newVal }));
                              }}
                              className={`w-full h-1.5 rounded-lg appearance-none bg-slate-300 dark:bg-slate-800 cursor-pointer ${themeStyles.sliderTrack}`}
                            />
                            <span className="text-[10px] text-slate-400 w-12 text-left">Tinggi</span>
                          </div>
                          
                          <p className={`text-[10px] ${themeStyles.textMuted} leading-relaxed`}>
                            {crit.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sidebar summary details */}
                <div className="flex flex-col gap-6">
                  
                  {/* Distribution list */}
                  <div className={`${themeStyles.card} flex flex-col gap-4 border border-indigo-500/20`}>
                    <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">Ringkasan Distribusi Bobot</h4>
                    <p className={`text-[11px] ${themeStyles.textMuted} leading-relaxed`}>Persentase bobot relatif di bawah berkorelasi langsung terhadap hasil prioritas ruko optimal.</p>
                    
                    <div className="flex flex-col gap-3.5">
                      {CRITERIA.map((crit, idx) => {
                        const percentage = (normalizedWeights[idx] * 100).toFixed(1);
                        return (
                          <div key={crit.id} className="flex flex-col gap-1 text-xs">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{crit.code} - {crit.name}</span>
                              <span className="font-mono font-bold text-indigo-500">{percentage}% ({normalizedWeights[idx].toFixed(4)})</span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full ${themeStyles.progressBg} overflow-hidden shadow-xs`}>
                              <div 
                                className={`h-full rounded-full ${themeStyles.progressBar}`} 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* TAB 4: TRANSPARENT MATRIX MATH (TOPSIS & WASPAS STEP-BY-STEP) */}
            {activeTab === 'math' && (
              <motion.div
                key="tab-math"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-8"
              >
                
                {/* Intro methodology */}
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-black">Audit Transparansi Perhitungan Matematis</h3>
                  <p className={`text-xs ${themeStyles.textMuted}`}>Lacak log perhitungan langkah demi langkah demi audit saintifik yang transparan dan bebas bias.</p>
                </div>

                {/* Sub-section: 1. Bobot Kriteria */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">1</span>
                    <h4 className="text-sm font-bold uppercase tracking-wider">Bobot Kriteria Ternormalisasi (W_j)</h4>
                  </div>
                  <div className={themeStyles.card}>
                    <p className={`text-xs ${themeStyles.textMuted} mb-4`}>Merupakan persentase kontribusi kepentingan kriteria hasil dari nilai input pembobotan langsung yang telah dinormalisasi.</p>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      {CRITERIA.map((crit, idx) => (
                        <div key={crit.id} className="p-3 rounded-lg bg-slate-500/5 border border-slate-200/10 flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-400">{crit.code}</span>
                          <span className="font-mono text-base font-black text-indigo-500 my-1">{normalizedWeights[idx].toFixed(4)}</span>
                          <span className="text-[10px] text-center text-slate-400 font-medium leading-tight truncate w-full">{crit.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sub-section: 2. TOPSIS Step-by-Step */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">2</span>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-500">Tahapan TOPSIS</h4>
                  </div>

                  {/* Step 2.1 Decision Matrix */}
                  <div className={themeStyles.card}>
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">TOPSIS Langkah A</span>
                      <h5 className="text-sm font-bold mt-0.5">Penyetaraan Skala Nilai (Normalisasi R)</h5>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Mengubah seluruh nilai asli kriteria ruko agar sebanding dalam rentang skala yang sama (0 sampai 1). Penyetaraan ini penting agar kriteria harga sewa tahunan (puluhan juta) dan kriteria jumlah kompetitor (angka satuan kecil) dapat dihitung secara adil tanpa ada kriteria yang mendominasi hanya karena angka satuannya lebih besar.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200/30">
                            <th className="p-2 text-left font-bold text-slate-400">Alternatif</th>
                            {CRITERIA.map(c => <th key={c.id} className="p-2 font-bold">{c.code}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {topsisResult.results.map((res, rIdx) => (
                            <tr key={res.alternativeId} className="border-b border-slate-200/15">
                              <td className="p-2 text-left font-bold text-slate-400">{res.name}</td>
                              {res.normalizedScores.map((val, cIdx) => (
                                <td key={cIdx} className="p-2">{val.toFixed(4)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Step 2.2 Weighted Decision Matrix */}
                  <div className={themeStyles.card}>
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">TOPSIS Langkah B</span>
                      <h5 className="text-sm font-bold mt-0.5">Penerapan Bobot Kepentingan (Y)</h5>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Mengalikan hasil nilai perbandingan ruko yang sudah distandarkan dengan persentase bobot kepentingan kriteria yang telah Anda atur. Ruko akan memperoleh poin kontribusi yang lebih besar pada kriteria-kriteria yang Anda prioritaskan dengan skala nilai tinggi.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200/30">
                            <th className="p-2 text-left font-bold text-slate-400">Alternatif</th>
                            {CRITERIA.map(c => <th key={c.id} className="p-2 font-bold">{c.code} ($W_j$)</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {topsisResult.results.map((res, rIdx) => (
                            <tr key={res.alternativeId} className="border-b border-slate-200/15">
                              <td className="p-2 text-left font-bold text-slate-400">{res.name}</td>
                              {res.weightedNormalized.map((val, cIdx) => (
                                <td key={cIdx} className="p-2 font-bold text-emerald-500">{val.toFixed(4)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Step 2.3 Solusi Ideal Positif Negatif */}
                  <div className={themeStyles.card}>
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">TOPSIS Langkah C</span>
                      <h5 className="text-sm font-bold mt-0.5">Penentuan Acuan Ruko Terbaik (A+) &amp; Terburuk (A-)</h5>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Sistem menarik nilai acuan tertinggi dan terendah untuk tiap kriteria. Ingat: kriteria <strong>Sewa Tahunan (C1)</strong> dan <strong>Jumlah Kompetitor (C5)</strong> dihitung sebagai beban/biaya (di mana ruko dengan nilai terkecil dianggap yang paling bagus/ideal). Sementara kriteria ruko lainnya dihitung sebagai keuntungan (di mana ruko dengan nilai terbesar dianggap paling bagus/ideal).</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200/30">
                            <th className="p-2 text-left font-bold text-slate-400">Himpunan Batas Ideal</th>
                            {CRITERIA.map(c => <th key={c.id} className="p-2 font-bold">{c.code}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-200/10 bg-emerald-500/5 text-emerald-600 font-bold">
                            <td className="p-2.5 text-left">🟢 Positif Ideal (A+)</td>
                            {topsisResult.matrixes.positiveIdeal.map((val, idx) => (
                              <td key={idx} className="p-2.5">{val.toFixed(4)}</td>
                            ))}
                          </tr>
                          <tr className="border-b border-slate-200/10 bg-rose-500/5 text-rose-500 font-bold">
                            <td className="p-2.5 text-left">🔴 Negatif Ideal (A-)</td>
                            {topsisResult.matrixes.negativeIdeal.map((val, idx) => (
                              <td key={idx} className="p-2.5">{val.toFixed(4)}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Step 2.4 Distance & Preference */}
                  <div className={themeStyles.card}>
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">TOPSIS Langkah D &amp; E</span>
                      <h5 className="text-sm font-bold mt-0.5">Jarak ke Solusi Ideal &amp; Skor Kelayakan Akhir (V_i)</h5>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Mengukur seberapa dekat lokasi ruko dengan ruko impian (Ideal Positif) serta seberapa jauh dari ruko terburuk yang perlu dihindari (Ideal Negatif). Skor nilai akhir berkisar antara 0 sampai 1; semakin mendekati angka 1, ruko tersebut semakin sempurna karena memenuhi kriteria impian harapan Anda.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200/30">
                            <th className="p-2 text-left font-bold text-slate-400">Alternatif</th>
                            <th className="p-2 font-bold text-emerald-500">Jarak Ideal Positif (D_i+)</th>
                            <th className="p-2 font-bold text-rose-500">Jarak Ideal Negatif (D_i-)</th>
                            <th className="p-2 font-bold text-indigo-500">Kedekatan Preferensi (V_i)</th>
                            <th className="p-2 font-bold text-indigo-700">Rank TOPSIS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topsisResult.results.map((res) => (
                            <tr key={res.alternativeId} className="border-b border-slate-200/15">
                              <td className="p-2 text-left font-bold text-slate-400">{res.name}</td>
                              <td className="p-2 text-emerald-500">{res.distanceToIdeal.toFixed(6)}</td>
                              <td className="p-2 text-rose-500">{res.distanceToNegativeIdeal.toFixed(6)}</td>
                              <td className="p-2 font-black text-indigo-500">{res.preference.toFixed(6)}</td>
                              <td className="p-2 font-bold">{res.rank}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Sub-section: 3. WASPAS Step-by-Step */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">3</span>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-blue-500">Tahapan WASPAS</h4>
                  </div>

                  {/* Step 3.1 Normalization */}
                  <div className={themeStyles.card}>
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">WASPAS Langkah A</span>
                      <h5 className="text-sm font-bold mt-0.5">Penyetaraan Skala Nilai Secara Linier</h5>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>
                        Menyetarakan seluruh nilai kriteria ke rentang standar 0 sampai 1 dengan metode linier agar seimbang: <br/>
                        • <strong>Keuntungan (Benefit)</strong>: Nilai ruko dibagi oleh nilai ruko tertinggi (semakin besar nilainya semakin mendekati angka 1). <br/>
                        • <strong>Biaya/Beban (Cost)</strong>: Nilai ruko terkecil dibagi oleh nilai ruko tersebut (semakin murah harganya, nilai hasil penyetaraannya semakin mendekati angka 1).
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200/30">
                            <th className="p-2 text-left font-bold text-slate-400">Alternatif</th>
                            {CRITERIA.map(c => <th key={c.id} className="p-2 font-bold">{c.code}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {waspasResult.results.map((res) => (
                            <tr key={res.alternativeId} className="border-b border-slate-200/15">
                              <td className="p-2 text-left font-bold text-slate-400">{res.name}</td>
                              {res.normalizedScores.map((val, cIdx) => (
                                <td key={cIdx} className="p-2">{val.toFixed(4)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Step 3.2 WSM Summing terms */}
                  <div className={themeStyles.card}>
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">WASPAS Langkah B - Model Penjumlahan Terbobot (WSM)</span>
                      <h5 className="text-sm font-bold mt-0.5">Skor Penjumlahan Linear Terbobot</h5>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Metode WSM menghitung skor kelayakan ruko dengan mengalikan nilai kriteria masing-masing dengan nilai bobot yang sesuai, kemudian menjumlahkan semuanya secara langsung untuk mendapatkan nilai akhir penjumlahan.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200/30">
                            <th className="p-2 text-left font-bold text-slate-400">Alternatif</th>
                            {CRITERIA.map(c => <th key={c.id} className="p-2 font-bold">{c.code}</th>)}
                            <th className="p-2 font-bold text-emerald-500">Skor Akhir WSM (Q_i_WSM)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waspasResult.results.map((res) => (
                            <tr key={res.alternativeId} className="border-b border-slate-200/15">
                              <td className="p-2 text-left font-bold text-slate-400">{res.name}</td>
                              {res.wsmTerms.map((val, cIdx) => (
                                <td key={cIdx} className="p-2">{val.toFixed(4)}</td>
                              ))}
                              <td className="p-2 font-bold text-emerald-500 bg-emerald-500/5">{res.wsm.toFixed(6)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Step 3.3 WPM Product terms */}
                  <div className={themeStyles.card}>
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">WASPAS Langkah C - Model Perkalian Terbobot (WPM)</span>
                      <h5 className="text-sm font-bold mt-0.5">Skor Perkalian Eksponensial Terbobot</h5>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Metode WPM menghitung skor kelayakan ruko dengan memangkatkan nilai kriteria masing-masing ruko menggunakan nilai bobotnya, lalu mengalikan seluruh hasil pangkat tersebut secara berurutan. Ini mendeteksi sensitivitas kecocokan secara ketat.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200/30">
                            <th className="p-2 text-left font-bold text-slate-400">Alternatif</th>
                            {CRITERIA.map(c => <th key={c.id} className="p-2 font-bold">{c.code}</th>)}
                            <th className="p-2 font-bold text-indigo-500">Skor Akhir WPM (Q_i_WPM)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waspasResult.results.map((res) => (
                            <tr key={res.alternativeId} className="border-b border-slate-200/15">
                              <td className="p-2 text-left font-bold text-slate-400">{res.name}</td>
                              {res.wpmTerms.map((val, cIdx) => (
                                <td key={cIdx} className="p-2">{val.toFixed(4)}</td>
                              ))}
                              <td className="p-2 font-bold text-indigo-500 bg-indigo-500/5">{res.wpm.toFixed(6)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Step 3.4 Aggregation WASPAS */}
                  <div className={themeStyles.card}>
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">WASPAS Langkah D</span>
                      <h5 className="text-sm font-bold mt-0.5">Kombinasi Skor Gabungan Akhir WASPAS (Q_i)</h5>
                      <p className={`text-xs ${themeStyles.textMuted} mt-0.5`}>Menggabungkan hasil model penjumlahan (WSM) dan model perkalian (WPM) menggunakan porsi pembatas Lambda (default: seimbang 50% - 50%). Penggabungan ini memberikan kestabilan keputusan yang sangat tangguh terhadap fluktuasi skor ekstrim.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200/30">
                            <th className="p-2 text-left font-bold text-slate-400">Alternatif</th>
                            <th className="p-2 font-semibold">Skor WSM (Q_i_WSM)</th>
                            <th className="p-2 font-semibold">Skor WPM (Q_i_WPM)</th>
                            <th className="p-2 font-bold text-blue-500">Hasil Indeks WASPAS (Q_i)</th>
                            <th className="p-2 font-bold text-blue-700">Rank WASPAS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waspasResult.results.map((res) => (
                            <tr key={res.alternativeId} className="border-b border-slate-200/15">
                              <td className="p-2 text-left font-bold text-slate-400">{res.name}</td>
                              <td className="p-2">{res.wsm.toFixed(6)}</td>
                              <td className="p-2">{res.wpm.toFixed(6)}</td>
                              <td className="p-2 font-black text-blue-500">{res.waspasScore.toFixed(6)}</td>
                              <td className="p-2 font-bold">{res.rank}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Informational Method Explanation Banner */}
        <section className={`p-5 rounded-2xl ${themeStyles.banner} border flex flex-col md:flex-row gap-4 items-start mt-4`}>
          <div className={`p-2 rounded-xl shrink-0 ${themeStyles.accentBadge}`}>
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-indigo-500 uppercase tracking-widest mb-1">Kombinasi Algoritma: TOPSIS &amp; WASPAS</h2>
            <p className={`text-xs leading-relaxed ${themeStyles.textMuted}`}>
              Sistem pendukung keputusan ini membantu Anda memetakan ruko ekspansi terbaik dengan mengintegrasikan dua pendekatan pengambilan keputusan terpopuler.
              <strong> TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)</strong> memeringkat ruko berdasarkan konsep bahwa alternatif terpilih harus memiliki jarak terdekat dari solusi ideal positif dan jarak terjauh dari solusi ideal negatif secara geometris.
              <strong> WASPAS (Weighted Aggregated Sum Product Assessment)</strong> menggabungkan model jumlah terbobot (WSM) dan model perkalian terbobot (WPM) dengan koefisien kustomisasi Lambda untuk memberikan tingkat akurasi dan kestabilan hasil pemeringkatan yang sangat andal dan robust.
            </p>
          </div>
        </section>

      </main>

      {/* Structured Minimalist Footer */}
      <footer className={`${themeStyles.footer} transition-colors mt-auto`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p className={themeStyles.textMuted}>
            &copy; 2026 DecisRuko SPK Penjualan. Diimplementasikan secara penuh pada sisi client menggunakan modern TypeScript &amp; React.
          </p>
          <div className="flex gap-4">
            <span className="font-semibold text-emerald-500">TOPSIS Solusi Ideal</span>
            <span className={themeStyles.textMuted}>|</span>
            <span className="font-semibold text-blue-500">WASPAS Aggregation</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
