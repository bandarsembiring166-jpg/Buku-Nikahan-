import React from 'react';
import { Transaction } from '../types';
import { formatRupiah } from '../utils';
import { Award, PieChart, TrendingUp, Users } from 'lucide-react';

interface SavingsStatsProps {
  transactions: Transaction[];
  coupleName1: string;
  coupleName2: string;
  targetAmount: number;
}

export default function SavingsStats({
  transactions,
  coupleName1,
  coupleName2,
  targetAmount
}: SavingsStatsProps) {
  // Calculations
  const totalSaved = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  
  const bandarTotal = transactions
    .filter((t) => t.depositor === 'Bandar')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const sellyTotal = transactions
    .filter((t) => t.depositor === 'Selly')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDeposits = transactions.length;
  const avgDeposit = totalDeposits > 0 ? totalSaved / totalDeposits : 0;

  // Percentage calculations
  const bandarPercent = totalSaved > 0 ? (bandarTotal / totalSaved) * 100 : 50;
  const sellyPercent = totalSaved > 0 ? (sellyTotal / totalSaved) * 100 : 50;

  // Category counts
  const categoryMap: { [key: string]: number } = {};
  transactions.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const sortedCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4); // Top 4 categories

  return (
    <div className="space-y-6">
      {/* Overview stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-rose-50/20 border border-rose-100/50 rounded-2xl">
          <div className="flex items-center gap-1.5 text-rose-500 mb-1">
            <Users className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Setoran</span>
          </div>
          <p className="text-xl font-extrabold text-rose-950">{totalDeposits} <span className="text-xs font-semibold text-rose-400">kali</span></p>
        </div>

        <div className="p-3 bg-rose-50/20 border border-rose-100/50 rounded-2xl">
          <div className="flex items-center gap-1.5 text-rose-500 mb-1">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Rata-rata</span>
          </div>
          <p className="text-lg font-extrabold text-rose-950 leading-tight">
            {formatRupiah(avgDeposit).replace(',00', '')}
          </p>
        </div>
      </div>

      {/* Proportional Split */}
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-xs font-bold text-rose-700">Proporsi Tabungan</span>
          <span className="text-[10px] text-rose-400 font-semibold italic">Siapa paling rajin? 🤫</span>
        </div>
        
        {totalSaved > 0 ? (
          <div className="space-y-2">
            <div className="h-5 w-full bg-rose-50 rounded-full overflow-hidden flex border border-rose-100 shadow-inner">
              <div
                style={{ width: `${bandarPercent}%` }}
                className="bg-gradient-to-r from-sky-400 to-sky-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-extrabold text-white"
                title={`${coupleName1}: ${formatRupiah(bandarTotal)}`}
              >
                {bandarPercent >= 15 && `${bandarPercent.toFixed(0)}%`}
              </div>
              <div
                style={{ width: `${sellyPercent}%` }}
                className="bg-gradient-to-r from-pink-400 to-pink-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-extrabold text-white"
                title={`${coupleName2}: ${formatRupiah(sellyTotal)}`}
              >
                {sellyPercent >= 15 && `${sellyPercent.toFixed(0)}%`}
              </div>
            </div>

            <div className="grid grid-cols-2 text-xs font-bold gap-2">
              <div className="flex items-center gap-1.5 text-sky-600">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
                <span className="truncate">{coupleName1}:</span>
                <span className="font-extrabold ml-auto">{formatRupiah(bandarTotal).replace(',00', '')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-pink-600">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block"></span>
                <span className="truncate">{coupleName2}:</span>
                <span className="font-extrabold ml-auto">{formatRupiah(sellyTotal).replace(',00', '')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-rose-300 font-medium italic">
            Belum ada proporsi data tabungan.
          </div>
        )}
      </div>

      {/* Top Categories Breakdown */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1 text-rose-700 text-xs font-bold">
          <PieChart className="h-4 w-4" />
          <span>Alokasi Kebutuhan Terbesar</span>
        </div>

        {sortedCategories.length > 0 ? (
          <div className="space-y-2">
            {sortedCategories.map(([cat, amount]) => {
              const percentage = totalSaved > 0 ? (amount / totalSaved) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-rose-950">
                    <span className="truncate">{cat}</span>
                    <span className="font-extrabold text-rose-600 shrink-0">
                      {formatRupiah(amount).replace(',00', '')} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-rose-50/50 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-rose-300 font-medium italic">
            Belum ada alokasi kategori.
          </div>
        )}
      </div>

      {/* Motivational message */}
      <div className="p-3.5 bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl border border-rose-100 flex gap-2.5 items-center">
        <div className="text-2xl">💍</div>
        <p className="text-xs text-rose-700 font-medium leading-relaxed">
          {totalSaved >= targetAmount ? (
            <span className="font-bold">Selamat! Target Rp 20.000.000 telah tercapai! Kalian luar biasa, bismillah menuju pelaminan! 🎉❤️</span>
          ) : (
            <span>
              Setiap Rupiah yang ditabung membawa kalian berdua selangkah lebih dekat menuju gerbang pernikahan yang berkah dan bahagia. Semangat!
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
