import React, { useState, useEffect } from 'react';
import { Transaction, AppConfig, GalleryPhoto } from './types';
import { formatRupiah, getDaysRemaining } from './utils';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import MilestoneTimeline from './components/MilestoneTimeline';
import SavingsStats from './components/SavingsStats';
import coupleAvatar from './assets/images/couple_avatar_1783163782362.jpg';
import { 
  Heart, 
  Settings, 
  Coins, 
  History, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  X, 
  Check, 
  Smile,
  Edit2,
  Image as ImageIcon,
  Trash2,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, onSnapshot, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db, storage, OperationType, handleFirestoreError } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject as deleteStorageObject } from 'firebase/storage';

// Pre-populate with cute default entries so it doesn't look empty at first launch
const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 't-init-1',
    amount: 1500000,
    depositor: 'Bandar',
    category: 'Cincin & Mahar',
    note: 'DP Cincin kawin cicilan pertama 💍',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
  },
  {
    id: 't-init-2',
    amount: 1000000,
    depositor: 'Selly',
    category: 'Umum',
    note: 'Uang jajan sisa bulan lalu, bismillah ❤️',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
  },
  {
    id: 't-init-3',
    amount: 2000000,
    depositor: 'Bandar',
    category: 'Gedung & Katering',
    note: 'Tabungan bulanan untuk DP Gedung 🏢',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  }
];

const DEFAULT_CONFIG: AppConfig = {
  coupleName1: 'Bandar',
  coupleName2: 'Selly',
  targetAmount: 20000000,
  targetDate: '2026-12-31',
  photoUrl: ''
};

interface HeartConfetti {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  const [activeTab, setActiveTab] = useState<'setor' | 'riwayat' | 'album' | 'milestones' | 'statistik'>('setor');
  const [showSettings, setShowSettings] = useState(false);
  const [confettis, setConfettis] = useState<HeartConfetti[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Temp form states for settings
  const [tempName1, setTempName1] = useState(config.coupleName1);
  const [tempName2, setTempName2] = useState(config.coupleName2);
  const [tempTarget, setTempTarget] = useState(config.targetAmount.toString());
  const [tempDate, setTempDate] = useState(config.targetDate);
  const [tempPhotoUrl, setTempPhotoUrl] = useState(config.photoUrl);

  // Sync with Firestore Real-time
  useEffect(() => {
    const configDocRef = doc(db, 'config', 'main');
    const unsubscribeConfig = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        setConfig(data);
        // Pre-fill temp state if loaded
        setTempName1(data.coupleName1);
        setTempName2(data.coupleName2);
        setTempTarget(data.targetAmount.toString());
        setTempDate(data.targetDate);
        setTempPhotoUrl(data.photoUrl);
      } else {
        // Create the initial config document if it doesn't exist
        setDoc(configDocRef, DEFAULT_CONFIG).catch((error) => {
          handleFirestoreError(error, OperationType.WRITE, 'config/main');
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/main');
    });

    const transactionsColRef = collection(db, 'transactions');
    const unsubscribeTransactions = onSnapshot(transactionsColRef, (querySnapshot) => {
      const items: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          amount: data.amount,
          depositor: data.depositor,
          category: data.category,
          note: data.note,
          date: data.date
        });
      });

      // Sort newest first
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Seed with beautiful starter records if empty
      if (querySnapshot.empty && items.length === 0) {
        setIsLoading(false);
        DEFAULT_TRANSACTIONS.forEach((t) => {
          setDoc(doc(db, 'transactions', t.id), {
            amount: t.amount,
            depositor: t.depositor,
            category: t.category,
            note: t.note,
            date: t.date
          }).catch((error) => {
            handleFirestoreError(error, OperationType.WRITE, `transactions/${t.id}`);
          });
        });
      } else {
        setTransactions(items);
        setIsLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    const photosColRef = collection(db, 'photos');
    const unsubscribePhotos = onSnapshot(photosColRef, (querySnapshot) => {
      const items: GalleryPhoto[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          url: data.url,
          createdAt: data.createdAt,
          storagePath: data.storagePath
        });
      });
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPhotos(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'photos');
    });

    return () => {
      unsubscribeConfig();
      unsubscribeTransactions();
      unsubscribePhotos();
    };
  }, []);

  const totalSaved = transactions.reduce((sum, item) => sum + item.amount, 0);
  const progressPercent = Math.min((totalSaved / config.targetAmount) * 100, 100);
  const daysRemaining = getDaysRemaining(config.targetDate);

  // Confetti triggering engine
  const triggerConfetti = () => {
    const colors = ['#f43f5e', '#ec4899', '#f472b6', '#fb7185', '#fda4af', '#f0abfc'];
    const newConfettis: HeartConfetti[] = Array.from({ length: 25 }).map((_, i) => ({
      id: `c-${Date.now()}-${i}`,
      x: Math.random() * 100, // random percentage across width
      y: 100 + Math.random() * 20, // start below card
      size: 12 + Math.random() * 18,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5
    }));
    setConfettis((prev) => [...prev, ...newConfettis]);

    // Cleanup confettis after animation finishes
    setTimeout(() => {
      setConfettis((prev) => prev.filter((c) => !newConfettis.find((nc) => nc.id === c.id)));
    }, 4000);
  };

  const handleAddTransaction = async (newT: Omit<Transaction, 'id' | 'date'>) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...newT,
        date: new Date().toISOString()
      });
      triggerConfetti();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'transactions');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800; // max dimension to fit comfortably within Firestore 1MB limits
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6)); // compress to jpeg at 0.6 quality (creates beautiful, small base64)
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Gagal memuat file gambar'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(file);
    });
  };

  const handleAddPhoto = async (file: File) => {
    setIsPhotoUploading(true);
    try {
      let finalUrl = '';
      let storagePath = '';
      
      try {
        // Try Firebase Storage first
        const path = `photos/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        const uploadResult = await uploadBytes(storageRef, file);
        finalUrl = await getDownloadURL(uploadResult.ref);
        storagePath = path;
        console.log('Berhasil mengunggah ke Firebase Storage:', finalUrl);
      } catch (storageError) {
        console.warn('Firebase Storage belum aktif atau mengalami kendala. Menggunakan kompresi Base64 lokal:', storageError);
        // Fallback to high-quality Base64 compressed image in Firestore
        finalUrl = await compressImage(file);
      }

      await addDoc(collection(db, 'photos'), {
        url: finalUrl,
        createdAt: new Date().toISOString(),
        ...(storagePath ? { storagePath } : {})
      });
      triggerConfetti();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'photos');
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: GalleryPhoto) => {
    try {
      if (photo.storagePath) {
        try {
          const storageRef = ref(storage, photo.storagePath);
          await deleteStorageObject(storageRef);
          console.log('Berhasil menghapus dari Firebase Storage:', photo.storagePath);
        } catch (storageError) {
          console.error('Gagal menghapus dari Firebase Storage, tetap melanjutkan menghapus data Firestore:', storageError);
        }
      }
      await deleteDoc(doc(db, 'photos', photo.id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `photos/${photo.id}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTarget = parseFloat(tempTarget);
    if (isNaN(newTarget) || newTarget <= 0) return;

    const newConfig: AppConfig = {
      coupleName1: tempName1.trim() || 'Bandar',
      coupleName2: tempName2.trim() || 'Selly',
      targetAmount: newTarget,
      targetDate: tempDate,
      photoUrl: tempPhotoUrl.trim()
    };

    try {
      await setDoc(doc(db, 'config', 'main'), newConfig);
      setShowSettings(false);
      triggerConfetti();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'config/main');
    }
  };

  // Sync temp state with actual config when settings panel is opened
  useEffect(() => {
    if (showSettings) {
      setTempName1(config.coupleName1);
      setTempName2(config.coupleName2);
      setTempTarget(config.targetAmount.toString());
      setTempDate(config.targetDate);
      setTempPhotoUrl(config.photoUrl);
    }
  }, [showSettings, config]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff8f6] via-[#fff5f6] to-[#fffaf0] flex flex-col justify-center items-center font-sans">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-rose-500 animate-pulse blur-xl opacity-30"></div>
          <Heart className="h-12 w-12 text-rose-500 fill-rose-500 animate-bounce relative z-10" />
        </div>
        <p className="text-rose-600 font-extrabold text-sm mt-5 animate-pulse tracking-wide">
          Menghubungkan ke Cinta Bandar & Selly...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff8f6] via-[#fff5f6] to-[#fffaf0] py-8 px-4 flex flex-col justify-center items-center font-sans antialiased overflow-x-hidden relative">
      {/* Floating Confetti Layer */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {confettis.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: '100vh', x: `${c.x}vw` }}
              animate={{ 
                opacity: [0, 1, 1, 0], 
                y: '-20vh',
                x: `${c.x + (Math.random() * 10 - 5)}vw`,
                rotate: [0, Math.random() * 360]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 3 + Math.random() * 2, 
                delay: c.delay,
                ease: 'easeOut'
              }}
              className="absolute text-rose-500 font-bold"
              style={{ fontSize: `${c.size}px`, color: c.color }}
            >
              ❤️
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-lg relative z-10" id="main-container">
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-rose-100/60 shadow-xl shadow-rose-100/30 overflow-hidden transition-all duration-300">
          
          {/* Header Area */}
          <div className="relative p-6 text-center bg-gradient-to-b from-rose-50/40 to-white/10 border-b border-rose-50/50">
            {/* Settings Trigger Gear */}
            <button
              id="settings-button"
              onClick={() => setShowSettings(true)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-100/50 text-rose-400 hover:text-rose-600 shadow-xs cursor-pointer transition-colors"
              title="Pengaturan Target"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Profile Picture Frame */}
            <div className="relative mx-auto w-32 h-32 mb-4 group">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 animate-pulse blur-md opacity-20"></div>
              <img
                id="couple-photo"
                src={config.photoUrl || coupleAvatar}
                alt={`${config.coupleName1} & ${config.coupleName2}`}
                referrerPolicy="no-referrer"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md relative z-10"
                onError={(e) => {
                  // Fallback if URL is invalid
                  (e.target as HTMLImageElement).src = coupleAvatar;
                }}
              />
              <button 
                onClick={() => setShowSettings(true)}
                className="absolute bottom-0 right-0 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full border-2 border-white shadow-md z-20 cursor-pointer transition-colors"
                title="Ganti Foto"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 tracking-tight font-sans">
              {config.coupleName1} & {config.coupleName2}
            </h1>
            <p className="text-rose-700/70 text-sm font-medium italic mt-1.5">
              Menabung Bersama Menuju Hari Bahagia ✨
            </p>

            {/* Dynamic countdown banner */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100/40 rounded-full text-rose-600 text-[11px] font-bold mt-3 shadow-xs">
              <Calendar className="h-3.5 w-3.5" />
              <span>{daysRemaining > 0 ? `${daysRemaining} Hari Menuju Akad Nikah 💍` : 'Semoga Menjadi Keluarga Sakinah Mawaddah Warahmah! ❤️'}</span>
            </div>
          </div>

          {/* Core Goal & Progress Track Area */}
          <div className="px-6 py-5 bg-[#fffdfd] border-b border-rose-50/30">
            <div className="flex justify-between items-baseline mb-2">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-extrabold text-rose-400 tracking-wider">Terkumpul Saat Ini</span>
                <p className="text-2xl font-black text-rose-950 tracking-tight">
                  {formatRupiah(totalSaved)}
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] uppercase font-extrabold text-rose-400 tracking-wider">Target Goal</span>
                <p className="text-sm font-bold text-rose-700">
                  {formatRupiah(config.targetAmount).replace(',00', '')}
                </p>
              </div>
            </div>

            {/* Elegant Rounded Progress bar with animated completion spark */}
            <div className="relative w-full h-4 bg-rose-50 rounded-full overflow-hidden border border-rose-100 shadow-inner">
              <motion.div
                id="progress-bar-fill"
                className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-600 rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                {/* Glossy overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              </motion.div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold text-rose-600">
                {progressPercent.toFixed(1)}% Tercapai
              </span>
              <span className="text-[10px] text-rose-400 font-semibold italic">
                {totalSaved >= config.targetAmount ? 'Alhamdulillah, Target Tercapai! 🎉' : `Kurang ${formatRupiah(config.targetAmount - totalSaved).replace(',00', '')}`}
              </span>
            </div>
          </div>

          {/* Quick tab switch bar */}
          <div className="flex border-b border-rose-50 bg-rose-50/10">
            <button
              id="tab-setor"
              onClick={() => setActiveTab('setor')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'setor'
                  ? 'border-rose-600 text-rose-700 bg-white font-extrabold'
                  : 'border-transparent text-rose-400 hover:text-rose-600'
              }`}
            >
              <Coins className="h-4 w-4" />
              <span>Setor</span>
            </button>
            <button
              id="tab-riwayat"
              onClick={() => setActiveTab('riwayat')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'riwayat'
                  ? 'border-rose-600 text-rose-700 bg-white font-extrabold'
                  : 'border-transparent text-rose-400 hover:text-rose-600'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Riwayat</span>
              {transactions.length > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {transactions.length}
                </span>
              )}
            </button>
            <button
              id="tab-album"
              onClick={() => setActiveTab('album')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'album'
                  ? 'border-rose-600 text-rose-700 bg-white font-extrabold'
                  : 'border-transparent text-rose-400 hover:text-rose-600'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              <span>Album</span>
              {photos.length > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {photos.length}
                </span>
              )}
            </button>
            <button
              id="tab-milestones"
              onClick={() => setActiveTab('milestones')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'milestones'
                  ? 'border-rose-600 text-rose-700 bg-white font-extrabold'
                  : 'border-transparent text-rose-400 hover:text-rose-600'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Milestone</span>
            </button>
            <button
              id="tab-statistik"
              onClick={() => setActiveTab('statistik')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'statistik'
                  ? 'border-rose-600 text-rose-700 bg-white font-extrabold'
                  : 'border-transparent text-rose-400 hover:text-rose-600'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Analisa</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'setor' && (
                  <TransactionForm 
                    onAddTransaction={handleAddTransaction} 
                    coupleName1={config.coupleName1}
                    coupleName2={config.coupleName2}
                  />
                )}
                
                {activeTab === 'riwayat' && (
                  <TransactionList
                    transactions={transactions}
                    onDeleteTransaction={handleDeleteTransaction}
                    coupleName1={config.coupleName1}
                    coupleName2={config.coupleName2}
                  />
                )}

                {activeTab === 'album' && (
                  <div className="space-y-6">
                    {/* Header Galeri */}
                    <div className="text-center pb-2">
                      <div className="inline-flex p-3 bg-rose-50 rounded-full text-rose-500 mb-2">
                        <ImageIcon className="h-6 w-6 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-black text-rose-950">Album Kenangan Kita</h3>
                      <p className="text-xs text-rose-500 font-medium max-w-sm mx-auto mt-1">
                        Koleksi momen indah {config.coupleName1} & {config.coupleName2}. Foto tersimpan otomatis di HP kalian berdua! 💕
                      </p>
                    </div>

                    {/* Upload Section */}
                    <div className="bg-rose-50/10 border border-rose-100/40 rounded-3xl p-4">
                      <label className="relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-rose-200 hover:border-rose-400 bg-white hover:bg-rose-50/30 rounded-2xl cursor-pointer transition-all duration-300 group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-5 text-center px-4">
                          {isPhotoUploading ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="h-6 w-6 border-3 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                              <p className="text-xs font-bold text-rose-600 mt-1">Mengunggah Kenangan Indah...</p>
                              <p className="text-[10px] text-rose-400 font-medium">Foto sedang disinkronkan ke cloud ✨</p>
                            </div>
                          ) : (
                            <>
                              <div className="p-2 bg-rose-50 rounded-full text-rose-400 group-hover:text-rose-500 transition-colors">
                                <Camera className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                              </div>
                              <p className="text-xs font-extrabold text-rose-700 mt-2">Pilih Foto dari Galeri HP Anda</p>
                              <p className="text-[9px] text-rose-400 font-semibold mt-0.5">Disimpan aman di cloud Firebase & terkirim ke pasangan</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleAddPhoto(file);
                            }
                          }}
                          disabled={isPhotoUploading}
                        />
                      </label>
                    </div>

                    {/* Photo Grid */}
                    <div>
                      {photos.length === 0 ? (
                        <div className="text-center py-12 px-6 bg-rose-50/20 rounded-3xl border border-dashed border-rose-100">
                          <span role="img" aria-label="love-camera" className="text-4xl block mb-2">📸</span>
                          <h4 className="text-sm font-bold text-rose-900">Belum ada foto album</h4>
                          <p className="text-xs text-rose-400 font-medium italic mt-1 max-w-xs mx-auto">
                            Klik tombol pilih foto di atas untuk mulai mengabadikan momen pertama bersama! 💕
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3" id="gallery-photo-grid">
                          <AnimatePresence>
                            {photos.map((photo) => (
                              <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative group rounded-2xl overflow-hidden bg-white border border-rose-100/50 shadow-sm flex flex-col hover:shadow-md transition-all duration-300"
                              >
                                {/* Image container with cursor pointer to open lightbox */}
                                <div 
                                  onClick={() => setSelectedPhoto(photo.url)}
                                  className="aspect-square w-full overflow-hidden relative bg-rose-50/10 cursor-zoom-in"
                                  title="Klik untuk memperbesar foto"
                                >
                                  <img
                                    src={photo.url}
                                    alt="Kenangan Indah"
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  {/* Hover overlay indicator */}
                                  <div className="absolute inset-0 bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <span className="text-[10px] text-white font-bold bg-rose-600/80 px-2.5 py-1 rounded-full backdrop-blur-xs">Lihat Foto 🔍</span>
                                  </div>
                                </div>
                                
                                {/* Info bar */}
                                <div className="p-2.5 bg-white flex justify-between items-center border-t border-rose-50/50">
                                  <span className="text-[10px] text-rose-400 font-bold">
                                    {new Date(photo.createdAt).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(photo)}
                                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="Hapus Foto"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'milestones' && (
                  <MilestoneTimeline 
                    totalSaved={totalSaved} 
                    coupleName1={config.coupleName1}
                    coupleName2={config.coupleName2}
                  />
                )}

                {activeTab === 'statistik' && (
                  <SavingsStats
                    transactions={transactions}
                    coupleName1={config.coupleName1}
                    coupleName2={config.coupleName2}
                    targetAmount={config.targetAmount}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Footer info brand */}
        <p className="text-center text-[11px] text-rose-400 font-semibold tracking-wide mt-6">
          Dibuat dengan ❤️ untuk Bandar & Selly • Menuju Sakinah Mawaddah Warahmah
        </p>
      </div>

      {/* Settings Dialog Overlay */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-rose-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl border border-rose-100 max-w-md w-full p-6 shadow-2xl relative"
              id="settings-modal"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-5 right-5 p-1.5 bg-rose-50 hover:bg-rose-100 rounded-full text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-lg mb-4 border-b border-rose-50 pb-3">
                <Settings className="h-5 w-5 text-rose-600 animate-spin" />
                <span>Pengaturan Target & Profil</span>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="settings-name1" className="block text-xs font-bold text-rose-700 mb-1">Nama Pria</label>
                    <input
                      id="settings-name1"
                      type="text"
                      value={tempName1}
                      onChange={(e) => setTempName1(e.target.value)}
                      placeholder="Bandar"
                      className="w-full px-3 py-2 border border-rose-100 rounded-xl text-rose-950 text-sm focus:border-rose-300 focus:outline-none transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-name2" className="block text-xs font-bold text-rose-700 mb-1">Nama Wanita</label>
                    <input
                      id="settings-name2"
                      type="text"
                      value={tempName2}
                      onChange={(e) => setTempName2(e.target.value)}
                      placeholder="Selly"
                      className="w-full px-3 py-2 border border-rose-100 rounded-xl text-rose-950 text-sm focus:border-rose-300 focus:outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="settings-target" className="block text-xs font-bold text-rose-700 mb-1">Target Tabungan (IDR)</label>
                  <input
                    id="settings-target"
                    type="number"
                    value={tempTarget}
                    onChange={(e) => setTempTarget(e.target.value)}
                    placeholder="20000000"
                    className="w-full px-3 py-2 border border-rose-100 rounded-xl text-rose-950 text-sm font-bold focus:border-rose-300 focus:outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="settings-date" className="block text-xs font-bold text-rose-700 mb-1">Tanggal Akad Nikah / Target</label>
                  <input
                    id="settings-date"
                    type="date"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-100 rounded-xl text-rose-950 text-sm focus:border-rose-300 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="settings-photo" className="block text-xs font-bold text-rose-700 mb-1">Link Foto Berdua (URL)</label>
                  <input
                    id="settings-photo"
                    type="url"
                    value={tempPhotoUrl}
                    onChange={(e) => setTempPhotoUrl(e.target.value)}
                    placeholder="https://contoh.com/foto-kalian.png"
                    className="w-full px-3 py-2 border border-rose-100 rounded-xl text-rose-950 text-xs placeholder-rose-300 focus:border-rose-300 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-rose-400 mt-1 italic leading-tight">
                    Biarkan kosong untuk menggunakan avatar ilustrasi bawaan yang menggemaskan.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-rose-50">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-700 text-sm font-bold cursor-pointer transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 rounded-xl text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-100"
                  >
                    <Check className="h-4 w-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Photo Preview */}
      <AnimatePresence>
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative max-w-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()} // prevent close when clicking image
            >
              <img
                src={selectedPhoto}
                alt="Kenangan Fullscreen"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl"
              />
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white/90 hover:text-white transition-all cursor-pointer"
                title="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
            <p className="text-rose-200/80 text-xs font-semibold mt-4 tracking-wider select-none">
              Klik di mana saja untuk menutup 💖
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
