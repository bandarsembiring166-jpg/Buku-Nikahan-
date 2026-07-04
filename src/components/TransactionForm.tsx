import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatRupiah } from '../utils';
import { Heart, Plus, Send, User } from 'lucide-react';
import { motion } from 'motion/react';

interface TransactionFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  coupleName1: string;
  coupleName2: string;
}

const CATEGORIES = [
  'Umum',
  'Gedung & Katering',
  'Cincin & Mahar',
  'Dekorasi & Dokumentasi',
  'Busana & Tata Rias',
  'Undangan & Souvenir',
  'Bulan Madu',
  'Lainnya'
];

export default function TransactionForm({ onAddTransaction, coupleName1, coupleName2 }: TransactionFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [depositor, setDepositor] = useState<'Bandar' | 'Selly'>('Bandar');
  const [category, setCategory] = useState<string>('Umum');
  const [note, setNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onAddTransaction({
      amount: numAmount,
      depositor,
      category,
      note: note.trim() || 'Menabung bersama! ✨'
    });

    setAmount('');
    setNote('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  const getDepositorName = (dep: 'Bandar' | 'Selly') => {
    return dep === 'Bandar' ? coupleName1 : coupleName2;
  };

  return (
    <form id="savings-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="input-amount" className="block text-sm font-semibold text-rose-700">
          Nominal Tabungan (Rp)
        </label>
        <div className="relative rounded-xl shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-rose-400 font-semibold sm:text-sm">Rp</span>
          </div>
          <input
            id="input-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Contoh: 500000"
            className="block w-full rounded-xl border border-rose-100 bg-rose-50/20 py-3 pl-10 pr-3 text-rose-950 placeholder-rose-300 focus:border-rose-300 focus:bg-white focus:ring-rose-200 focus:outline-none sm:text-sm font-semibold transition-all"
            required
            min="1"
          />
        </div>
        {amount && !isNaN(parseFloat(amount)) && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-rose-500 font-medium italic pl-1"
          >
            Sama dengan: {formatRupiah(parseFloat(amount))}
          </motion.p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-rose-700 mb-2">
          Siapa yang menabung?
        </label>
        <div className="grid grid-cols-2 gap-3" id="depositor-selector">
          <button
            id="depositor-bandar"
            type="button"
            onClick={() => setDepositor('Bandar')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-sm transition-all duration-300 cursor-pointer ${
              depositor === 'Bandar'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white border-transparent shadow-md scale-[1.02]'
                : 'bg-white text-rose-700 border-rose-100 hover:bg-rose-50/50'
            }`}
          >
            <span role="img" aria-label="Bandar" className="text-base">👦</span>
            <span>{getDepositorName('Bandar')}</span>
          </button>
          <button
            id="depositor-selly"
            type="button"
            onClick={() => setDepositor('Selly')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-sm transition-all duration-300 cursor-pointer ${
              depositor === 'Selly'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white border-transparent shadow-md scale-[1.02]'
                : 'bg-white text-rose-700 border-rose-100 hover:bg-rose-50/50'
            }`}
          >
            <span role="img" aria-label="Selly" className="text-base">👧</span>
            <span>{getDepositorName('Selly')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="input-category" className="block text-sm font-semibold text-rose-700 mb-1">
            Kategori
          </label>
          <select
            id="input-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full rounded-xl border border-rose-100 bg-white py-2.5 px-3 text-rose-950 focus:border-rose-300 focus:outline-none sm:text-sm font-medium transition-all"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="input-note" className="block text-sm font-semibold text-rose-700 mb-1">
            Catatan / Pesan Cinta ❤️
          </label>
          <input
            id="input-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Tabungan gaji bulan ini"
            className="block w-full rounded-xl border border-rose-100 bg-rose-50/10 py-2.5 px-3 text-rose-950 placeholder-rose-300 focus:border-rose-300 focus:bg-white focus:outline-none sm:text-sm font-medium transition-all"
          />
        </div>
      </div>

      <motion.button
        id="submit-deposit"
        type="submit"
        whileTap={{ scale: 0.97 }}
        className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-200 cursor-pointer flex items-center justify-center gap-2 transition-all"
      >
        {isSuccess ? (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: [1, 1.2, 1] }}
            className="flex items-center gap-1.5"
          >
            <Heart className="h-5 w-5 fill-white text-white animate-pulse" />
            <span>Berhasil Ditambahkan!</span>
          </motion.div>
        ) : (
          <>
            <Plus className="h-5 w-5" />
            <span>Tambah Tabungan</span>
          </>
        )}
      </motion.button>
    </form>
  );
}
