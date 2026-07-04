import React from 'react';
import { Milestone } from '../types';
import { formatRupiah } from '../utils';
import { CheckCircle2, Circle, Heart, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface MilestoneTimelineProps {
  totalSaved: number;
  coupleName1: string;
  coupleName2: string;
}

const DEFAULT_MILESTONES: Milestone[] = [
  {
    id: 'm1',
    title: '💍 Cincin & Seserahan',
    target: 5000000,
    description: 'Booking DP cincin pernikahan & persiapan hantaran adat.',
    iconName: 'ring'
  },
  {
    id: 'm2',
    title: '🍽️ Katering & Gedung',
    target: 10000000,
    description: 'Mengunci tanggal impian dengan pembayaran uang muka sewa gedung & katering.',
    iconName: 'building'
  },
  {
    id: 'm3',
    title: '👗 Busana & Dokumentasi',
    target: 15000000,
    description: 'Fitting baju pengantin impian dan sewa fotografer handal.',
    iconName: 'dress'
  },
  {
    id: 'm4',
    title: '🎉 Hari Bahagia (Goal!)',
    target: 20000000,
    description: 'Semua persiapan lunas dan siap menyambut akad nikah & resepsi megah!',
    iconName: 'party'
  }
];

export default function MilestoneTimeline({ totalSaved, coupleName1, coupleName2 }: MilestoneTimelineProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-rose-500" />
          <span>Milestone Perjalanan</span>
        </h3>
        <span className="text-[10px] text-rose-400 font-semibold italic">Tahapan menuju halal 💖</span>
      </div>

      <div className="relative pl-6 space-y-5 border-l-2 border-rose-100 py-1 ml-3">
        {DEFAULT_MILESTONES.map((m, index) => {
          const isReached = totalSaved >= m.target;
          const nextMilestone = totalSaved < m.target && (index === 0 || totalSaved >= DEFAULT_MILESTONES[index - 1].target);

          return (
            <div key={m.id} className="relative">
              {/* Milestone bullet node */}
              <div className="absolute -left-[31px] top-1">
                {isReached ? (
                  <motion.div
                    initial={{ scale: 0.6 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center border-4 border-white shadow-sm"
                  >
                    <Heart className="h-2.5 w-2.5 text-white fill-white" />
                  </motion.div>
                ) : (
                  <div className={`w-4 h-4 rounded-full border-3 border-white shadow-xs ${
                    nextMilestone ? 'bg-rose-400 animate-pulse ring-4 ring-rose-100' : 'bg-rose-100'
                  }`} />
                )}
              </div>

              {/* Card Container */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isReached
                  ? 'bg-rose-50/40 border-rose-100/60 shadow-xs'
                  : nextMilestone
                  ? 'bg-white border-rose-200/80 shadow-sm ring-1 ring-rose-100/50'
                  : 'bg-stone-50/50 border-stone-100 text-stone-400'
              }`}>
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`text-xs font-bold ${
                    isReached ? 'text-rose-950 line-through decoration-rose-300' : nextMilestone ? 'text-rose-900' : 'text-stone-400'
                  }`}>
                    {m.title}
                  </h4>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                    isReached
                      ? 'bg-rose-100/50 text-rose-700'
                      : nextMilestone
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : 'bg-stone-100 text-stone-400'
                  }`}>
                    {isReached ? 'Selesai!' : formatRupiah(m.target).replace(',00', '')}
                  </span>
                </div>
                
                <p className={`text-[11px] mt-1 font-medium leading-relaxed ${
                  isReached ? 'text-rose-800/60' : nextMilestone ? 'text-rose-700/80' : 'text-stone-400/70'
                }`}>
                  {m.description}
                </p>

                {/* Progress helper if active */}
                {nextMilestone && (
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-amber-600">
                      <span>Kekurangan Tabungan:</span>
                      <span>{formatRupiah(m.target - totalSaved).replace(',00', '')}</span>
                    </div>
                    <div className="w-full h-1.5 bg-rose-50 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${(totalSaved / m.target) * 100}%` }}
                        className="h-full bg-gradient-to-r from-rose-400 to-amber-400 rounded-full"
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
