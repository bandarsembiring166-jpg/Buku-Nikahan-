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
  Camera,
  Copy
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
  photoUrl: '',
  bankName: 'Bank Syariah Indonesia (BSI)',
  accountNumber: '7141234567',
  accountName: 'Bandar Sembiring'
};

const getInitialConfig = (): AppConfig => {
  if (typeof window !== 'undefined') {
    const localBankName = localStorage.getItem('bankName');
    const localAccountNumber = localStorage.getItem('accountNumber');
    const localAccountName = localStorage.getItem('accountName');
    
    return {
      ...DEFAULT_CONFIG,
      bankName: localBankName || DEFAULT_CONFIG.bankName,
      accountNumber: localAccountNumber || DEFAULT_CONFIG.accountNumber,
      accountName: localAccountName || DEFAULT_CONFIG.accountName,
    };
  }
  return DEFAULT_CONFIG;
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
  const [config, setConfig] = useState<AppConfig>(getInitialConfig);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [activeSavingsTab, setActiveSavingsTab] = useState<'progres' | 'milestones' | 'statistik'>('progres');
  const [activeTransactionTab, setActiveTransactionTab] = useState<'catat' | 'riwayat'>('catat');
  const [confettis, setConfettis] = useState<HeartConfetti[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Inline account editing states
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editAccountName, setEditAccountName] = useState('');

  // Temp form states for settings
  const [tempName1, setTempName1] = useState(config.coupleName1);
  const [tempName2, setTempName2] = useState(config.coupleName2);
  const [tempTarget, setTempTarget] = useState(config.targetAmount.toString());
  const [tempDate, setTempDate] = useState(config.targetDate);
  const [tempPhotoUrl, setTempPhotoUrl] = useState(config.photoUrl);
  const [tempBankName, setTempBankName] = useState(config.bankName || 'Bank Syariah Indonesia (BSI)');
  const [tempAccountNumber, setTempAccountNumber] = useState(config.accountNumber || '7141234567');
  const [tempAccountName, setTempAccountName] = useState(config.accountName || 'Bandar Sembiring');

  // Sync with Firestore Real-time
  useEffect(() => {
    const configDocRef = doc(db, 'config', 'main');
    const unsubscribeConfig = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        
        const localBankName = localStorage.getItem('bankName');
        const localAccountNumber = localStorage.getItem('accountNumber');
        const localAccountName = localStorage.getItem('accountName');

        const mergedData: AppConfig = {
          ...DEFAULT_CONFIG,
          bankName: localBankName || DEFAULT_CONFIG.bankName,
          accountNumber: localAccountNumber || DEFAULT_CONFIG.accountNumber,
          accountName: localAccountName || DEFAULT_CONFIG.accountName,
          ...data
        };
        setConfig(mergedData);
        // Pre-fill temp state if loaded
        setTempName1(mergedData.coupleName1);
        setTempName2(mergedData.coupleName2);
        setTempTarget(mergedData.targetAmount.toString());
        setTempDate(mergedData.targetDate);
        setTempPhotoUrl(mergedData.photoUrl);
        setTempBankName(mergedData.bankName);
        setTempAccountNumber(mergedData.accountNumber);
        setTempAccountName(mergedData.accountName);

        // Keep localStorage updated in real-time
        if (mergedData.bankName) localStorage.setItem('bankName', mergedData.bankName);
        if (mergedData.accountNumber) localStorage.setItem('accountNumber', mergedData.accountNumber);
        if (mergedData.accountName) localStorage.setItem('accountName', mergedData.accountName);
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

  const handleCopyAccountNumber = () => {
    const accNum = config.accountNumber || '7141234567';
    navigator.clipboard.writeText(accNum).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Gagal menyalin nomor rekening:', err);
    });
  };

  const handleStartEditAccount = () => {
    setEditBankName(config.bankName || 'Bank Syariah Indonesia (BSI)');
    setEditAccountNumber(config.accountNumber || '7141234567');
    setEditAccountName(config.accountName || 'Bandar Sembiring');
    setIsEditingAccount(true);
  };

  const handleSaveAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const bank = editBankName.trim() || 'Bank Syariah Indonesia (BSI)';
    const accNum = editAccountNumber.trim() || '7141234567';
    const accName = editAccountName.trim() || 'Bandar Sembiring';

    // Save to localStorage
    localStorage.setItem('bankName', bank);
    localStorage.setItem('accountNumber', accNum);
    localStorage.setItem('accountName', accName);

    // Update config state instantly
    const updatedConfig: AppConfig = {
      ...config,
      bankName: bank,
      accountNumber: accNum,
      accountName: accName
    };
    setConfig(updatedConfig);

    try {
      const configDocRef = doc(db, 'config', 'main');
      await setDoc(configDocRef, updatedConfig);
      setIsEditingAccount(false);
      triggerConfetti();
    } catch (err) {
      console.error('Gagal menyimpan ke Firestore, tetap disimpan secara lokal:', err);
      setIsEditingAccount(false);
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
      photoUrl: tempPhotoUrl.trim(),
      bankName: tempBankName.trim() || 'Bank Syariah Indonesia (BSI)',
      accountNumber: tempAccountNumber.trim() || '7141234567',
      accountName: tempAccountName.trim() || 'Bandar Sembiring'
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
      setTempBankName(config.bankName || 'Bank Syariah Indonesia (BSI)');
      setTempAccountNumber(config.accountNumber || '7141234567');
      setTempAccountName(config.accountName || 'Bandar Sembiring');
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
    <div className="min-h-screen bg-gradient-to-tr from-[#FAF5F2] via-[#FFFBF9] to-[#FAF0ED] py-8 px-4 flex flex-col justify-center items-center font-sans antialiased overflow-x-hidden relative">
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

      {/* Elegant Header Banner */}
      <header className="w-full text-center mb-8 relative z-10 max-w-5xl px-4">
        <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-24 h-24 bg-rose-200/20 blur-2xl rounded-full pointer-events-none"></div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/70 backdrop-blur-md border border-rose-100/50 rounded-full text-[10px] tracking-widest font-black uppercase text-rose-500/85 mb-3.5 shadow-2xs">
          <Sparkles className="h-3 w-3 animate-pulse text-rose-400" />
          <span>Celengan Pernikahan Digital</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-900 via-[#9E645A] to-rose-950 tracking-tight leading-tight">
          Tabungan {config.coupleName1} & {config.coupleName2}
        </h1>
        <p className="text-[12px] md:text-sm text-[#8E7470] font-medium max-w-md mx-auto mt-1.5 px-2 leading-relaxed">
          Mencatat perjalanan menabung bersama menuju mahligai rumah tangga sakinah, mawaddah, warahmah.
        </p>
      </header>

      {/* Modern Bento CSS Grid Container */}
      <div className="w-full max-w-5xl relative z-10 px-1 sm:px-4 mb-4" id="main-grid-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Profil & Rekening */}
          <div className="md:col-span-1 lg:col-span-5 flex flex-col gap-6">
            
            {/* BLOCK 1: FOTO & NAMA */}
            <div id="block-foto-nama" className="relative bg-white/45 backdrop-blur-xl rounded-[32px] border border-rose-100/60 p-6 shadow-md shadow-rose-950/5 hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center overflow-hidden">
              <div className="absolute -left-10 -top-10 text-rose-100/20 text-[100px] select-none pointer-events-none font-bold">🌸</div>
              <div className="absolute -right-10 -bottom-10 text-rose-100/20 text-[100px] select-none pointer-events-none font-bold">💍</div>
              
              {/* Badge label */}
              <span className="absolute left-6 top-5 text-[9px] font-mono font-extrabold tracking-widest text-rose-400/60 uppercase">01 / Profil & Album</span>

              {/* Settings button top right */}
              <button
                id="settings-button"
                onClick={() => setShowSettings(true)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-100/50 text-rose-400 hover:text-rose-600 shadow-2xs cursor-pointer transition-colors"
                title="Pengaturan Target"
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* Profile image with edit overlay */}
              <div className="relative w-36 h-36 mt-4 mb-4 group">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-300 via-pink-400 to-rose-400 animate-pulse blur-md opacity-25"></div>
                <img
                  id="couple-photo"
                  src={config.photoUrl || coupleAvatar}
                  alt={`${config.coupleName1} & ${config.coupleName2}`}
                  referrerPolicy="no-referrer"
                  className="w-36 h-36 rounded-full object-cover border-4 border-white shadow-md relative z-10 transition-transform duration-500 group-hover:scale-[1.03]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = coupleAvatar;
                  }}
                />
                <button 
                  onClick={() => setShowSettings(true)}
                  className="absolute bottom-0 right-1 p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full border border-white shadow-md z-20 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  title="Ganti Foto"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <h2 className="text-2xl font-black text-rose-950 tracking-tight leading-tight">
                {config.coupleName1} & {config.coupleName2}
              </h2>
              <p className="text-[#9E645A] text-xs font-bold italic mt-1.5">
                Menabung Bersama Menuju Hari Bahagia ✨
              </p>

              {/* Countdown badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-100/40 rounded-full text-rose-700 text-[11px] font-extrabold mt-4 shadow-3xs">
                <Calendar className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span>{daysRemaining > 0 ? `${daysRemaining} Hari Menuju Akad Nikah 💍` : 'Semoga Sakinah Mawaddah Warahmah! ❤️'}</span>
              </div>

              {/* Open Album Button */}
              <div className="w-full mt-6 border-t border-rose-100/30 pt-5 flex flex-col gap-2">
                <button
                  id="btn-open-album"
                  onClick={() => setShowAlbumModal(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 via-rose-400 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span>Buka Album Kenangan ({photos.length} Foto)</span>
                  <span className="inline-flex items-center justify-center bg-white/20 px-1.5 py-0.5 rounded-full text-[9px] font-black">🔍</span>
                </button>
                <p className="text-[10px] text-rose-400/80 font-semibold italic mt-0.5">
                  Simpan momen pertama tabungan & kebersamaan kalian
                </p>
              </div>

            </div>

            {/* BLOCK 3: INFORMASI REKENING */}
            <div id="block-informasi-rekening" className="relative bg-white/45 backdrop-blur-xl rounded-[32px] border border-rose-100/60 p-6 shadow-md shadow-rose-950/5 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden">
              {/* Badge label */}
              <span className="text-[9px] font-mono font-extrabold tracking-widest text-rose-400/60 uppercase mb-4 block">03 / Informasi Rekening</span>

              <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-500 border border-rose-100/40">
                  <Copy className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-black text-rose-900 uppercase tracking-wider">Rekening Bersama</h3>
                  <p className="text-[10px] text-[#8E7470] font-semibold leading-tight mt-0.5">Lakukan transfer ke rekening terdaftar di bawah ini</p>
                </div>
                {!isEditingAccount && (
                  <button
                    id="btn-edit-rekening"
                    type="button"
                    onClick={handleStartEditAccount}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white/80 hover:bg-rose-50 text-rose-700 hover:text-rose-800 text-[10px] font-extrabold rounded-lg transition-all border border-rose-100/60 cursor-pointer"
                    title="Edit Informasi Rekening"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingAccount ? (
                <form id="joint-account-edit-form" onSubmit={handleSaveAccount} className="space-y-3 bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border border-rose-100/40 relative z-10 shadow-inner">
                  <div className="flex items-center justify-between pb-1.5 border-b border-rose-100/30">
                    <span className="text-[10px] font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1">
                      <span>📝 Pengaturan Rekening</span>
                    </span>
                    <button
                      id="btn-inline-cancel-rekening"
                      type="button"
                      onClick={() => setIsEditingAccount(false)}
                      className="text-rose-400 hover:text-rose-600 font-extrabold text-[10px] transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label htmlFor="card-edit-bank" className="block text-[9px] font-extrabold text-rose-500 uppercase tracking-wider mb-1">Nama Bank</label>
                      <input
                        id="card-edit-bank"
                        type="text"
                        value={editBankName}
                        onChange={(e) => setEditBankName(e.target.value)}
                        placeholder="Contoh: Bank Syariah Indonesia (BSI)"
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-100 rounded-lg text-rose-950 text-xs focus:border-rose-300 focus:outline-none transition-all font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="card-edit-name" className="block text-[9px] font-extrabold text-rose-500 uppercase tracking-wider mb-1">Nama Pemilik</label>
                      <input
                        id="card-edit-name"
                        type="text"
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        placeholder="Contoh: Bandar Sembiring"
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-100 rounded-lg text-rose-950 text-xs focus:border-rose-300 focus:outline-none transition-all font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="card-edit-number" className="block text-[9px] font-extrabold text-rose-500 uppercase tracking-wider mb-1">Nomor Rekening</label>
                      <input
                        id="card-edit-number"
                        type="text"
                        value={editAccountNumber}
                        onChange={(e) => setEditAccountNumber(e.target.value)}
                        placeholder="Contoh: 7141234567"
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-100 rounded-lg text-rose-950 text-xs font-mono font-bold tracking-wider focus:border-rose-300 focus:outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1.5">
                    <button
                      id="btn-cancel-rekening"
                      type="button"
                      onClick={() => setIsEditingAccount(false)}
                      className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      id="btn-save-rekening"
                      type="submit"
                      className="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Simpan 💾
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 bg-white/55 p-4 rounded-2xl border border-rose-100/40 relative z-10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-rose-600/80 font-bold text-[11px]">Bank</span>
                    <span className="font-extrabold text-rose-950 text-[12px]">{config.bankName || 'Bank Syariah Indonesia (BSI)'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs border-t border-rose-100/30 pt-2.5">
                    <span className="text-rose-600/80 font-bold text-[11px]">Pemilik (A/N)</span>
                    <span className="font-extrabold text-rose-950 text-[12px]">{config.accountName || 'Bandar Sembiring'}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-rose-100/30 pt-2.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider leading-none">Nomor Rekening</span>
                      <span className="font-mono text-base font-extrabold text-rose-900 tracking-wider mt-1 select-all">
                        {config.accountNumber || '7141234567'}
                      </span>
                    </div>
                    
                    <div className="relative self-end sm:self-center">
                      <button
                        type="button"
                        onClick={handleCopyAccountNumber}
                        className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-rose-200 cursor-pointer select-none"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 animate-bounce" />
                            <span>Disalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Salin Rekening</span>
                          </>
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {copied && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-rose-950 text-white text-[9px] font-extrabold rounded-md shadow-md whitespace-nowrap z-20 pointer-events-none"
                          >
                            Teks Disalin ke HP! 💖
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Progres & Riwayat */}
          <div className="md:col-span-1 lg:col-span-7 flex flex-col gap-6">

            {/* BLOCK 2: PROGRES TABUNGAN */}
            <div id="block-progres-tabungan" className="relative bg-white/45 backdrop-blur-xl rounded-[32px] border border-rose-100/60 p-6 shadow-md shadow-rose-950/5 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden">
              {/* Badge label */}
              <span className="text-[9px] font-mono font-extrabold tracking-widest text-rose-400/60 uppercase mb-3 block">02 / Progres Goal</span>

              {/* Progress metric headers */}
              <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2 mb-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] uppercase font-bold text-rose-500 tracking-wider">Terkumpul Saat Ini</span>
                  <p className="text-3xl font-black text-rose-950 tracking-tight">
                    {formatRupiah(totalSaved)}
                  </p>
                </div>
                <div className="sm:text-right space-y-0.5">
                  <span className="text-[11px] uppercase font-bold text-rose-400 tracking-wider">Target Pernikahan</span>
                  <p className="text-lg font-black text-rose-700">
                    {formatRupiah(config.targetAmount).replace(',00', '')}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative w-full h-5 bg-rose-50/50 rounded-full overflow-hidden border border-rose-100 shadow-inner">
                <motion.div
                  id="progress-bar-fill"
                  className="h-full bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500 rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                </motion.div>
              </div>

              <div className="flex justify-between items-center mt-3 pb-4 border-b border-rose-100/30">
                <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100/50 shadow-3xs">
                  {progressPercent.toFixed(1)}% Tercapai
                </span>
                <span className="text-[11px] text-[#8E7470] font-bold italic">
                  {totalSaved >= config.targetAmount ? 'Alhamdulillah, Target Tercapai! 🎉' : `Kurang ${formatRupiah(config.targetAmount - totalSaved).replace(',00', '')}`}
                </span>
              </div>

              {/* Inner card tabs for progress breakdown */}
              <div className="flex gap-2.5 my-4 bg-rose-50/20 p-1.5 rounded-2xl border border-rose-100/40">
                <button
                  type="button"
                  onClick={() => setActiveSavingsTab('progres')}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeSavingsTab === 'progres'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-xs'
                      : 'text-rose-500 hover:text-rose-800 hover:bg-rose-50/40'
                  }`}
                >
                  Motivasi ✨
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSavingsTab('milestones')}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeSavingsTab === 'milestones'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-xs'
                      : 'text-rose-500 hover:text-rose-800 hover:bg-rose-50/40'
                  }`}
                >
                  Milestone 🏆
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSavingsTab('statistik')}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeSavingsTab === 'statistik'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-xs'
                      : 'text-rose-500 hover:text-rose-800 hover:bg-rose-50/40'
                  }`}
                >
                  Analisa 📈
                </button>
              </div>

              {/* Subtab Content Area */}
              <div className="bg-white/45 p-4 rounded-2xl border border-rose-100/40 min-h-[220px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSavingsTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeSavingsTab === 'progres' && (
                      <div className="space-y-4 pt-1">
                        <div className="p-4 bg-gradient-to-br from-[#FFF9F7] to-[#FAF2EF] rounded-2xl border border-rose-100/60 flex gap-3 shadow-3xs">
                          <span className="text-3xl shrink-0">💝</span>
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide">Pesan Kebersamaan</h4>
                            <p className="text-xs text-[#8E7470] font-medium leading-relaxed">
                              "Barangsiapa menikah, maka ia telah melengkapi separuh agamanya. Dan hendaklah ia bertakwa kepada Allah dalam memelihara separuh sisanya." (HR. Al-Baihaqi)
                            </p>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-[#FFF9F7] to-[#FAF2EF] rounded-2xl border border-rose-100/60 flex gap-3 shadow-3xs">
                          <span className="text-3xl shrink-0">📊</span>
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide">Kecepatan Menabung</h4>
                            <p className="text-xs text-[#8E7470] font-medium leading-relaxed">
                              Hingga hari ini kalian telah mencatatkan <span className="font-extrabold text-rose-600">{transactions.length} setoran</span> dengan rata-rata nominal tabungan sebesar <span className="font-extrabold text-rose-600">{formatRupiah(transactions.length > 0 ? totalSaved / transactions.length : 0).replace(',00', '')}</span> per transaksi.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeSavingsTab === 'milestones' && (
                      <MilestoneTimeline 
                        totalSaved={totalSaved} 
                        coupleName1={config.coupleName1}
                        coupleName2={config.coupleName2}
                      />
                    )}

                    {activeSavingsTab === 'statistik' && (
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

            {/* BLOCK 4: RIWAYAT TRANSAKSI */}
            <div id="block-riwayat-transaksi" className="relative bg-white/45 backdrop-blur-xl rounded-[32px] border border-rose-100/60 p-6 shadow-md shadow-rose-950/5 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden">
              {/* Badge label */}
              <span className="text-[9px] font-mono font-extrabold tracking-widest text-rose-400/60 uppercase mb-3 block">04 / Catatan Transaksi</span>

              {/* Subtabs for setoran/riwayat */}
              <div className="flex gap-2.5 mb-5 bg-rose-50/20 p-1.5 rounded-2xl border border-rose-100/40">
                <button
                  type="button"
                  onClick={() => setActiveTransactionTab('catat')}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTransactionTab === 'catat'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-xs'
                      : 'text-rose-500 hover:text-rose-800 hover:bg-rose-50/40'
                  }`}
                >
                  <Coins className="h-4 w-4" />
                  <span>Setor Tabungan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTransactionTab('riwayat')}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTransactionTab === 'riwayat'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-xs'
                      : 'text-rose-500 hover:text-rose-800 hover:bg-rose-50/40'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>Riwayat Setoran</span>
                  {transactions.length > 0 && (
                    <span className="inline-flex items-center justify-center bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full shadow-3xs">
                      {transactions.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Subtab content list/form */}
              <div className="bg-white/45 p-4 rounded-2xl border border-rose-100/40 min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTransactionTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeTransactionTab === 'catat' && (
                      <TransactionForm 
                        onAddTransaction={handleAddTransaction} 
                        coupleName1={config.coupleName1}
                        coupleName2={config.coupleName2}
                      />
                    )}

                    {activeTransactionTab === 'riwayat' && (
                      <TransactionList
                        transactions={transactions}
                        onDeleteTransaction={handleDeleteTransaction}
                        coupleName1={config.coupleName1}
                        coupleName2={config.coupleName2}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Brand Footer */}
      <footer className="w-full text-center relative z-10 max-w-5xl mt-4 px-4 pb-4">
        <p className="text-[11px] text-[#9C7F7B] font-extrabold tracking-wider uppercase leading-none">
          Dibuat dengan ❤️ untuk {config.coupleName1} & {config.coupleName2}
        </p>
        <p className="text-[10px] text-rose-400/80 font-bold italic mt-1">
          Menuju Keluarga Sakinah Mawaddah Warahmah
        </p>
      </footer>

      {/* Album Kenangan Modal Overlay */}
      <AnimatePresence>
        {showAlbumModal && (
          <div className="fixed inset-0 bg-rose-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl rounded-[32px] border border-rose-100/80 max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              id="album-modal"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAlbumModal(false)}
                className="absolute top-5 right-5 p-1.5 bg-rose-50 hover:bg-rose-100 rounded-full text-rose-400 hover:text-rose-600 transition-colors cursor-pointer z-10"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Header Galeri */}
              <div className="text-center pb-4 border-b border-rose-100/40 mb-6">
                <div className="inline-flex p-3 bg-rose-50 rounded-full text-rose-500 mb-2">
                  <ImageIcon className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-rose-950">Album Kenangan Kita 💖</h3>
                <p className="text-xs text-[#8E7470] font-medium max-w-md mx-auto mt-1">
                  Koleksi foto indah {config.coupleName1} & {config.coupleName2}. Foto tersimpan otomatis di awan cloud & tersambung langsung ke HP kalian berdua!
                </p>
              </div>

              {/* Upload Section */}
              <div className="bg-[#FAF0ED] border border-rose-100/50 rounded-2xl p-4 mb-6">
                <label className="relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-rose-200 hover:border-rose-400 bg-white hover:bg-rose-50/30 rounded-xl cursor-pointer transition-all duration-300 group">
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
                        <p className="text-[9px] text-[#8E7470] font-semibold mt-0.5">Disimpan aman di cloud Firebase & terkirim ke pasangan</p>
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
              <div className="max-h-[40vh] overflow-y-auto pr-1">
                {photos.length === 0 ? (
                  <div className="text-center py-12 px-6 bg-rose-50/20 rounded-2xl border border-dashed border-rose-100">
                    <span role="img" aria-label="love-camera" className="text-4xl block mb-2">📸</span>
                    <h4 className="text-sm font-bold text-rose-900">Belum ada foto album</h4>
                    <p className="text-xs text-[#8E7470] font-medium italic mt-1 max-w-xs mx-auto">
                      Pilih foto di atas untuk mulai mengabadikan momen pertama bersama! 💕
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" id="gallery-photo-grid">
                    <AnimatePresence>
                      {photos.map((photo) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative group rounded-xl overflow-hidden bg-white border border-rose-100/40 shadow-xs flex flex-col hover:shadow-md transition-all duration-300"
                        >
                          {/* Image container */}
                          <div 
                            onClick={() => {
                              setSelectedPhoto(photo.url);
                            }}
                            className="aspect-square w-full overflow-hidden relative bg-rose-50/10 cursor-zoom-in"
                            title="Klik untuk memperbesar"
                          >
                            <img
                              src={photo.url}
                              alt="Kenangan Indah"
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <span className="text-[9px] text-white font-bold bg-rose-600/80 px-2 py-0.5 rounded-full backdrop-blur-xs">Lihat 🔍</span>
                            </div>
                          </div>
                          
                          {/* Info bar */}
                          <div className="p-2 bg-white flex justify-between items-center border-t border-rose-50/50">
                            <span className="text-[9px] text-[#8E7470] font-bold">
                              {new Date(photo.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(photo)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
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

              {/* Bottom info */}
              <div className="text-center mt-6 pt-4 border-t border-rose-100/40">
                <button
                  type="button"
                  onClick={() => setShowAlbumModal(false)}
                  className="py-2.5 px-6 bg-[#B7847E] hover:bg-[#A6746F] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-200"
                >
                  Selesai & Tutup Album ✨
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

                {/* Joint Account Section in Settings */}
                <div className="border-t border-rose-100/50 pt-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-[13px] uppercase tracking-wider mb-1">
                    <span role="img" aria-label="bank">💳</span>
                    <span>Informasi Rekening Bersama</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="settings-bank" className="block text-[11px] font-bold text-rose-700 mb-1">Nama Bank</label>
                      <input
                        id="settings-bank"
                        type="text"
                        value={tempBankName}
                        onChange={(e) => setTempBankName(e.target.value)}
                        placeholder="Contoh: BSI, BCA, Mandiri"
                        className="w-full px-3 py-2 border border-rose-100 rounded-xl text-rose-950 text-xs focus:border-rose-300 focus:outline-none transition-all font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-accname" className="block text-[11px] font-bold text-rose-700 mb-1">Pemilik Rekening</label>
                      <input
                        id="settings-accname"
                        type="text"
                        value={tempAccountName}
                        onChange={(e) => setTempAccountName(e.target.value)}
                        placeholder="Contoh: Bandar Sembiring"
                        className="w-full px-3 py-2 border border-rose-100 rounded-xl text-rose-950 text-xs focus:border-rose-300 focus:outline-none transition-all font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="settings-accnum" className="block text-[11px] font-bold text-rose-700 mb-1">Nomor Rekening</label>
                    <input
                      id="settings-accnum"
                      type="text"
                      value={tempAccountNumber}
                      onChange={(e) => setTempAccountNumber(e.target.value)}
                      placeholder="Contoh: 7141234567"
                      className="w-full px-3 py-2 border border-rose-100 rounded-xl text-rose-950 text-xs font-mono font-bold tracking-wider focus:border-rose-300 focus:outline-none transition-all"
                      required
                    />
                  </div>
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
