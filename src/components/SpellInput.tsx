import { useState, useEffect } from 'react';
import { Clock, RotateCcw, ShieldAlert, Save, Lock, CalendarClock } from 'lucide-react';
import type { DailyData } from '../types';
import { useTheme } from '../ThemeContext';
import SaveConfirmationModal from './SaveConfirmationModal';

interface SpellInputProps {
  dateKey: string;
  dailyData: DailyData;
  isFullyBlocked: boolean;
  blockedMinutes: number;
  effectiveLimit: number;
  isAdmin: boolean;
  isFutureDate: boolean;
  useSpells: boolean;
  onUpdate: (dateKey: string, data: DailyData) => void;
  onReset: (dateKey: string) => void;
  onOverride: () => void;
}

export default function SpellInput({
  dateKey, dailyData, isFullyBlocked, blockedMinutes: _, effectiveLimit, isAdmin, isFutureDate, useSpells, onUpdate, onReset, onOverride
}: SpellInputProps) {
  const { theme } = useTheme();
  const isGlass = theme === 'glass';

  const [spell1, setSpell1] = useState(dailyData.spell1 || 0);
  const [spell2, setSpell2] = useState(dailyData.spell2 || 0);
  const [spell3, setSpell3] = useState(dailyData.spell3 || 0);
  const [singleTime, setSingleTime] = useState(dailyData.singleTime || 0);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setSpell1(dailyData.spell1 || 0);
    setSpell2(dailyData.spell2 || 0);
    setSpell3(dailyData.spell3 || 0);
    setSingleTime(dailyData.singleTime || 0);
  }, [dailyData, dateKey]);

  const confirmSave = () => {
    const data: DailyData = useSpells
      ? { ...dailyData, spell1, spell2, spell3, singleTime: 0 }
      : { ...dailyData, spell1: 0, spell2: 0, spell3: 0, singleTime };
    onUpdate(dateKey, data);
    setShowSaveConfirm(false);
  };
  const confirmReset = () => { setSpell1(0); setSpell2(0); setSpell3(0); setSingleTime(0); onReset(dateKey); setShowResetConfirm(false); };

  const formatDate = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const screenTotal = useSpells ? spell1 + spell2 + spell3 : singleTime;
  const deviceTotal = Object.values(dailyData.devices || {}).reduce((s, v) => s + (v as number), 0);
  const bonus = dailyData.bonusMinutes || 0;
  const penalty = dailyData.penaltyMinutes || 0;
  const total = screenTotal + deviceTotal;
  const adjustedLimit = effectiveLimit + bonus - penalty;
  const isOverLimit = total > adjustedLimit;

  // For user read-only
  const propScreenTotal = useSpells ? (dailyData.spell1 + dailyData.spell2 + dailyData.spell3) : (dailyData.singleTime || 0);
  const propTotal = propScreenTotal + deviceTotal;
  const propAdjustedLimit = effectiveLimit + bonus - penalty;

  const cardCls = isGlass ? 'glass-card' : 'bg-white border border-[#e5e5e5] rounded-xl';
  const headCls = isGlass ? 'text-gray-900' : 'text-[#0f0f0f]';
  const subCls = isGlass ? 'text-gray-400' : 'text-[#999]';
  const inpCls = isGlass
    ? 'w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-900 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all'
    : 'w-full px-3 py-2.5 border border-[#e5e5e5] rounded-lg text-base bg-[#fafafa] font-medium focus:outline-none focus:border-[#0f0f0f] transition-all';
  const btnPrimary = isGlass ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-[#0f0f0f] text-white hover:bg-[#333]';
  const btnSecondary = isGlass ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'border border-[#e5e5e5] bg-white text-[#0f0f0f] hover:bg-[#f5f5f5]';

  // ── USER READ-ONLY ──
  if (!isAdmin) {
    return (
      <div className={`${cardCls} p-6 md:p-7`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${isGlass ? 'bg-gradient-to-br from-gray-900 to-gray-700' : 'bg-[#0f0f0f]'}`}>
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${headCls}`}>Screen Time</h2>
            <p className={`text-sm font-medium ${subCls}`}>{formatDate(dateKey)}</p>
          </div>
        </div>

        <div className={`rounded-xl p-3 mb-3 ${isGlass ? 'bg-amber-50 border border-amber-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-700" /><p className="text-sm font-semibold text-amber-700">View Only</p></div>
        </div>

        {propTotal > 0 || bonus > 0 || penalty > 0 ? (
          <div className="space-y-3">
            <div className={`rounded-xl p-4 ${isGlass ? 'bg-gray-50' : 'bg-[#f5f5f5]'}`}>
              {useSpells ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[['Spell 1', dailyData.spell1], ['Spell 2', dailyData.spell2], ['Spell 3', dailyData.spell3]].map(([l, v]) => (
                    <div key={l as string}><p className={`text-[10px] font-bold uppercase ${subCls}`}>{l}</p><p className={`text-xl font-bold ${headCls}`}>{v}</p></div>
                  ))}
                </div>
              ) : (
                <div className="text-center"><p className={`text-[10px] font-bold uppercase ${subCls}`}>Total Time</p><p className={`text-3xl font-bold ${headCls}`}>{dailyData.singleTime || 0}</p><p className={`text-xs ${subCls}`}>minutes</p></div>
              )}
            </div>
            {deviceTotal > 0 && <div className={`rounded-xl p-3 ${isGlass ? 'bg-gray-50' : 'bg-[#f5f5f5]'}`}>{Object.entries(dailyData.devices || {}).map(([n, m]) => <div key={n} className="flex justify-between text-sm py-0.5"><span className={subCls}>{n}</span><span className={`font-bold ${headCls}`}>{m as number}m</span></div>)}</div>}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {bonus > 0 && <span className="text-green-600 bg-green-50 px-2 py-1 rounded-lg">🎁 +{bonus}m bonus</span>}
              {penalty > 0 && <span className="text-red-600 bg-red-50 px-2 py-1 rounded-lg">⚠️ −{penalty}m penalty</span>}
            </div>
            <div className={`text-center py-2.5 rounded-xl font-bold text-sm ${propTotal > propAdjustedLimit ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {propTotal} / {propAdjustedLimit} min {propTotal > propAdjustedLimit ? `⚠️ Over by ${propTotal - propAdjustedLimit}` : `✅ ${propAdjustedLimit - propTotal} left`}
            </div>
          </div>
        ) : (
          !isFutureDate && <div className={`text-center py-6 rounded-xl ${isGlass ? 'bg-gray-50' : 'bg-[#f5f5f5]'}`}><p className={`text-sm ${subCls}`}>No data entered yet</p></div>
        )}
      </div>
    );
  }

  // ── ADMIN EDIT ──
  return (
    <>
      <div className={`${cardCls} p-6 md:p-7`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${isGlass ? 'bg-gradient-to-br from-gray-900 to-gray-700' : 'bg-[#0f0f0f]'}`}>
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${headCls}`}>Log Time</h2>
            <p className={`text-sm font-medium ${subCls}`}>{formatDate(dateKey)}</p>
          </div>
        </div>

        {isFutureDate && <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 ${isGlass ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}><CalendarClock className="w-4 h-4" /><p className="text-sm font-semibold">Future date — view only</p></div>}
        {isFullyBlocked && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3"><Lock className="w-4 h-4 text-red-600" /><p className="text-sm font-semibold text-red-600">Fully Blocked</p></div>}

        {!isFullyBlocked && (
          <div className="space-y-4">
            {/* Screen Time */}
            {useSpells ? (
              <div className="grid grid-cols-3 gap-3">
                {[{ l: 'Spell 1', v: spell1, s: setSpell1 }, { l: 'Spell 2', v: spell2, s: setSpell2 }, { l: 'Spell 3', v: spell3, s: setSpell3 }].map(sp => (
                  <div key={sp.l}><label className={`text-xs font-semibold ${subCls}`}>{sp.l}</label><input type="number" value={sp.v || ''} min={0} readOnly={isFutureDate} disabled={isFutureDate} onChange={e => sp.s(Math.max(0, parseInt(e.target.value) || 0))} className={inpCls} /></div>
                ))}
              </div>
            ) : (
              <div><label className={`text-xs font-semibold ${subCls}`}>Total Minutes</label><input type="number" value={singleTime || ''} min={0} readOnly={isFutureDate} disabled={isFutureDate} onChange={e => setSingleTime(Math.max(0, parseInt(e.target.value) || 0))} className={inpCls} /></div>
            )}

            {/* Summary badges */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {deviceTotal > 0 && <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">📱 +{deviceTotal}m devices</span>}
              {bonus > 0 && <span className="text-green-600 bg-green-50 px-2 py-1 rounded-lg">🎁 +{bonus}m bonus</span>}
              {penalty > 0 && <span className="text-red-600 bg-red-50 px-2 py-1 rounded-lg">⚠️ −{penalty}m penalty</span>}
            </div>

            {/* Total */}
            <div className={`text-center py-2.5 rounded-xl font-bold text-sm ${isOverLimit ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {total} / {adjustedLimit} min {isOverLimit ? `⚠️ Over by ${total - adjustedLimit}` : `✅ ${adjustedLimit - total} left`}
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { if (!isFutureDate && !isFullyBlocked) setShowSaveConfirm(true); }} disabled={isFutureDate || isFullyBlocked} className={`py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 ${btnPrimary}`}><Save className="w-4 h-4" /> Save</button>
              <button onClick={() => { if (!isFutureDate) setShowResetConfirm(true); }} disabled={isFutureDate} className={`py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 ${btnSecondary}`}><RotateCcw className="w-4 h-4" /> Reset</button>
            </div>
            <button onClick={onOverride} className="w-full py-2.5 rounded-lg bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 border border-red-200/50 flex items-center justify-center gap-2"><ShieldAlert className="w-4 h-4" /> Admin Override</button>
          </div>
        )}
      </div>
      <SaveConfirmationModal isOpen={showSaveConfirm} actionLabel="save this time entry" onClose={() => setShowSaveConfirm(false)} onConfirm={confirmSave} />
      <SaveConfirmationModal isOpen={showResetConfirm} actionLabel="reset this time entry" onClose={() => setShowResetConfirm(false)} onConfirm={confirmReset} />
    </>
  );
}
