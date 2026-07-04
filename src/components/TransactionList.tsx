import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatRupiah, formatDate } from '../utils';
import { Search, Trash2, Filter, Heart, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  coupleName1: string;
  coupleName2: string;
}

export default function TransactionList({
  transactions,
  onDeleteTransaction,
  coupleName1,
  coupleName2
}: TransactionListProps) {
  const [filterDepositor, setFilterDepositor] = useState<'All' | 'Bandar' | 'Selly'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredTransactions = transactions
    .filter((t) => {
      if (filterDepositor === 'Bandar' && t.depositor !== 'Bandar') return false;
      if (filterDepositor === 'Selly' && t.depositor !== 'Selly') return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return (
          t.note.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          formatRupiah(t.amount).includes(query)
        );
      }
      return true;
    })
    // Sort newest first
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getDepositorName = (dep: 'Bandar' | 'Selly') => {
    return dep === 'Bandar' ? coupleName1 : coupleName2;
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteTransaction(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      // Reset confirmation after 3 seconds
      setTimeout(() => {
        setConfirmDeleteId((prev) => (prev === id ? null : prev));
      }, 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-300 h-4.5 w-4.5" />
          <input
            id="search-transactions"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari catatan atau nominal..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-rose-100 rounded-xl text-rose-950 placeholder-rose-300 text-sm focus:border-rose-300 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-1.5 bg-rose-50/50 p-1 rounded-xl border border-rose-100">
          <button
            id="filter-all"
            onClick={() => setFilterDepositor('All')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterDepositor === 'All'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-rose-400 hover:text-rose-600'
            }`}
          >
            Semua
          </button>
          <button
            id="filter-bandar"
            onClick={() => setFilterDepositor('Bandar')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterDepositor === 'Bandar'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-rose-400 hover:text-rose-600'
            }`}
          >
            👦 {coupleName1}
          </button>
          <button
            id="filter-selly"
            onClick={() => setFilterDepositor('Selly')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterDepositor === 'Selly'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-rose-400 hover:text-rose-600'
            }`}
          >
            👧 {coupleName2}
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-rose-100">
        <AnimatePresence initial={false}>
          {filteredTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10 px-4 bg-rose-50/20 rounded-2xl border border-dashed border-rose-100"
            >
              <Heart className="h-8 w-8 text-rose-200 mx-auto mb-2 animate-pulse" />
              <p className="text-rose-400 text-sm font-medium">Belum ada catatan tabungan yang cocok.</p>
              <p className="text-rose-300 text-xs mt-1">Ayo mulai menabung bersama kekasihmu!</p>
            </motion.div>
          ) : (
            filteredTransactions.map((t) => {
              const isBandar = t.depositor === 'Bandar';
              const isConfirming = confirmDeleteId === t.id;
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3.5 bg-white border border-rose-50 rounded-2xl shadow-xs hover:shadow-md hover:border-rose-100 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                      isBandar ? 'bg-sky-50 text-sky-600' : 'bg-pink-50 text-pink-600'
                    }`}>
                      {isBandar ? '👦' : '👧'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-rose-950">
                          {getDepositorName(t.depositor)}
                        </span>
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 rounded-md">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-rose-700/80 text-xs font-medium truncate mt-0.5" title={t.note}>
                        "{t.note}"
                      </p>
                      <p className="text-[10px] text-rose-300 font-medium mt-0.5">
                        {formatDate(t.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 ml-4 shrink-0">
                    <span className="font-extrabold text-sm text-rose-600">
                      +{formatRupiah(t.amount).replace(',00', '')}
                    </span>
                    <button
                      onClick={(e) => handleDeleteClick(t.id, e)}
                      className={`p-1.5 rounded-lg text-rose-300 hover:text-rose-600 transition-colors cursor-pointer ${
                        isConfirming ? 'bg-red-50 text-red-600' : 'hover:bg-rose-50'
                      }`}
                      title={isConfirming ? 'Klik lagi untuk menghapus' : 'Hapus catatan'}
                    >
                      {isConfirming ? (
                        <span className="text-[10px] font-bold px-1 animate-pulse">Yakin?</span>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-rose-400 font-medium bg-rose-50/30 p-2 rounded-lg">
        <Info className="h-3.5 w-3.5 text-rose-400 shrink-0" />
        <span>Data tersinkronisasi secara real-time via Firebase Cloud.</span>
      </div>
    </div>
  );
}
