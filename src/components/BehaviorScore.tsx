import { motion } from 'framer-motion';
import { Trophy, Target, TrendingDown } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface BehaviorScoreProps {
  score: number;
  grade: string;
  label: string;
  onTimePct: number;
  avgPenalty: number;
}

function getScoreColor(score: number): { primary: string; gradient: string; classic: string } {
  if (score >= 80) return { primary: '#0E7F68', gradient: 'from-green-400 to-emerald-500', classic: 'text-brevo-teal' };
  if (score >= 60) return { primary: '#eab308', gradient: 'from-yellow-400 to-orange-500', classic: 'text-yellow-600' };
  if (score >= 40) return { primary: '#f97316', gradient: 'from-orange-400 to-red-500', classic: 'text-orange-600' };
  return { primary: '#ef4444', gradient: 'from-red-500 to-rose-600', classic: 'text-red-600' };
}

export default function BehaviorScore({ score, grade, label, onTimePct, avgPenalty }: BehaviorScoreProps) {
  const { theme } = useTheme();
  const isGlass = theme === 'glass';
  const colors = getScoreColor(score);

  const progress = score / 100;

  /* ══════ CLASSIC — Brevo-inspired ══════ */
  if (!isGlass) {
    return (
      <div className="bg-white border border-brevo-border rounded-[24px] p-6">
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-brevo-ink">Behavior score</h3>
          <p className="text-xs text-[#8A9A8F] mt-0.5">Based on last 7 days</p>
        </div>

        <div className="flex flex-col items-center">
          {/* Gauge */}
          <div className="relative w-36 h-36 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#EEF2EB" strokeWidth="9" />
              <motion.circle
                cx="60" cy="60" r="52" fill="none"
                stroke={colors.primary}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - progress) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={score}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-extrabold text-brevo-ink"
              >
                {score}
              </motion.span>
              <span className="text-[11px] text-[#8A9A8F] font-bold">Grade {grade}</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex items-center gap-8 mt-1">
            <div className="text-center">
              <div className="text-base font-extrabold text-brevo-ink">{onTimePct}%</div>
              <div className="text-[10.5px] text-[#8A9A8F] font-semibold flex items-center gap-1 justify-center mt-0.5">
                <Target className="w-3 h-3" /> On-time
              </div>
            </div>
            <div className="text-center">
              <div className={`text-base font-extrabold ${avgPenalty > 0 ? 'text-brevo-danger' : 'text-brevo-ink'}`}>
                {avgPenalty} min
              </div>
              <div className="text-[10.5px] text-[#8A9A8F] font-semibold flex items-center gap-1 justify-center mt-0.5">
                <TrendingDown className="w-3 h-3" /> Avg penalty
              </div>
            </div>
          </div>

          <div className="w-full mt-5 pt-4 border-t border-brevo-border text-center">
            <span className="text-xs font-semibold text-[#4B5C53]">{label}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ══════ GLASS ══════ */
  return (
    <div className="glass-card p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-5">
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-md`}>
          <Trophy className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Behavior Score</h3>
          <p className="text-xs text-gray-400 font-medium">Based on last 7 days</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* Gauge */}
        <div className="relative w-44 h-44 mb-5">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="7" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none"
              stroke={colors.primary}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - progress) }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${colors.primary}50)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={score}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-4xl font-extrabold tracking-tight`}
              style={{ color: colors.primary }}
            >
              {score}
            </motion.span>
            <span className="text-[10px] text-gray-400 font-semibold">/ 100</span>
          </div>
        </div>

        {/* Grade */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 mb-1">
          <span className={`text-3xl font-extrabold tracking-tight`} style={{ color: colors.primary }}>
            {grade}
          </span>
          <span className="text-xl text-gray-300">•</span>
          <span className="text-base font-bold text-gray-900">{label}</span>
        </motion.div>

        {/* Breakdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full mt-6 pt-5 border-t border-gray-200/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                <Target className="w-3 h-3 text-green-600" />
              </div>
              On-time rate
            </span>
            <span className="text-sm font-bold text-gray-900">{onTimePct}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-3 h-3 text-red-500" />
              </div>
              Avg daily penalty
            </span>
            <span className={`text-sm font-bold ${avgPenalty > 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {avgPenalty} min
            </span>
          </div>
        </motion.div>

        {/* Grade scale */}
        <div className="w-full mt-5 pt-4 border-t border-gray-200/50">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
            <span className="text-red-500">F &lt;50</span>
            <span className="text-orange-500">D</span>
            <span className="text-yellow-600">C</span>
            <span className="text-yellow-500">B</span>
            <span className="text-green-500">A</span>
            <span className="text-emerald-600">A+</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 shadow-md"
              style={{ left: `calc(${score}% - 6px)`, borderColor: colors.primary }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
