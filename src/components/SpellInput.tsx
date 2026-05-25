import { useState, useEffect } from 'react';
import { Clock, RotateCcw, ShieldAlert, Save, Lock, CalendarClock, Gift, AlertTriangle, Monitor, Plus, X } from 'lucide-react';
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
  const [bonusMinutes, setBonusMinutes] = useState(dailyData.bonusMinutes || 0);
  const [penaltyMins, setPenaltyMins] = useState(dailyData.penaltyMinutes || 0);
  const [penaltyReason, setPenaltyReason] = useState(dailyData.penaltyReason || '');
  const [devices, setDevices] = useState<Record<string, number>>(dailyData.devices || {});
  const [newDeviceName, setNewDeviceName] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setSpell1(dailyData.spell1 || 0);
    setSpell2(dailyData.spell2 || 0);
    setSpell3(dailyData.spell3 || 0);
    setSingleTime(dailyData.singleTime || 0);
    setBonusMinutes(dailyData.bonusMinutes || 0);
    setPenaltyMins(dailyData.penaltyMinutes || 0);
    setPenaltyReason(dailyData.penaltyReason || '');
    setDevices(dailyData.devices || {});
  }, [dailyData, dateKey]);

  const requestSave = () => { if (isFutureDate || isFullyBlocked) return; setShowSaveConfirm(true); };
  const confirmSave = () => {
    const data: DailyData = useSpells
      ? { spell1, spell2, spell3, singleTime: 0, bonusMinutes, penaltyMinutes: penaltyMins, penaltyReason, devices }
      : { spell1: 0, spell2: 0, spell3: 0, singleTime, bonusMinutes, penaltyMinutes: penaltyMins, penaltyReason, devices };
    onUpdate(dateKey, data);
    setShowSaveConfirm(false);
  };
  const requestReset = () => { if (isFutureDate) return; setShowResetConfirm(true); };
  const confirmReset = () => { setSpell1(0); setSpell2(0); setSpell3(0); setSingleTime(0); setBonusMinutes(0); setPenaltyMins(0); setPenaltyReason(''); setDevices({}); onReset(dateKey); setShowResetConfirm(false); };

  const formatDate = (key: string) => { const d = new Date(key + 'T00:00:00'); return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); };

  const screenTotal = useSpells ? spell1 + spell2 + spell3 : singleTime;
  const deviceTotal = Object.values(devices).reduce((s, v) => s + v, 0);
  const total = screenTotal + deviceTotal;
  const adjustedLimit = effectiveLimit + bonusMinutes - penaltyMins;
  const isOverLimit = total > adjustedLimit;
  const disableEditing = isFutureDate || isFullyBlocked;

  // Data from dailyData prop (for user read-only view)
  const propScreenTotal = useSpells ? (dailyData.spell1 + dailyData.spell2 + dailyData.spell3) : (dailyData.singleTime || 0);
  const propDeviceTotal = Object.values(dailyData.devices || {}).reduce((s, v) => s + v, 0);
  const propTotal = propScreenTotal + propDeviceTotal;
  const propAdjustedLimit = effectiveLimit + (dailyData.bonusMinutes || 0) - (dailyData.penaltyMinutes || 0);

  const addDevice = () => {
    if (!newDeviceName.trim()) return;
    setDevices(prev => ({ ...prev, [newDeviceName.trim()]: 0 }));
    setNewDeviceName('');
  };

  const modals = (
    <>
      <SaveConfirmationModal isOpen={showSaveConfirm} actionLabel="save this time entry" onClose={() => setShowSaveConfirm(false)} onConfirm={confirmSave} />
      <SaveConfirmationModal isOpen={showResetConfirm} actionLabel="reset this time entry" onClose={() => setShowResetConfirm(false)} onConfirm={confirmReset} />
    </>
  );

  // ── Shared input styles ──
  const inpCls = isGlass
    ? 'w-full px-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-900 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all'
    : 'w-full px-3 py-2.5 border border-[#e5e5e5] rounded-lg text-base bg-[#fafafa] font-medium focus:outline-none focus:border-[#0f0f0f] transition-all';
  const smallInpCls = isGlass
    ? 'w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200/80 text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all'
    : 'w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm bg-[#fafafa] font-medium focus:outline-none focus:border-[#0f0f0f] transition-all';
  const cardCls = isGlass ? 'glass-card' : 'bg-white border border-[#e5e5e5] rounded-xl';
  const headCls = isGlass ? 'text-gray-900' : 'text-[#0f0f0f]';
  const subCls = isGlass ? 'text-gray-400' : 'text-[#999]';
  const btnPrimary = isGlass ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-[#0f0f0f] text-white hover:bg-[#333]';
  const btnSecondary = isGlass ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'border border-[#e5e5e5] bg-white text-[#0f0f0f] hover:bg-[#f5f5f5]';

  // ── USER READ-ONLY VIEW ──
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

        {isFutureDate && <div className={`${isGlass ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-blue-50 border border-blue-200 text-blue-700'} rounded-xl p-4 mb-4 flex items-center gap-3`}><CalendarClock className="w-4 h-4 flex-shrink-0" /><p className="text-sm font-semibold">Future date — view only</p></div>}

        <div className={`rounded-xl p-4 mb-3 ${isGlass ? 'bg-amber-50 border border-amber-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-700" /><p className="text-sm font-semibold text-amber-700">View Only — Data entered by admin</p></div>
        </div>

        {propTotal > 0 ? (
          <div className="space-y-3">
            {/* Screen time */}
            <div className={`rounded-xl p-4 ${isGlass ? 'bg-gray-50' : 'bg-[#f5f5f5]'}`}>
              {useSpells ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className={`text-[10px] font-bold uppercase ${subCls}`}>Spell 1</p><p className={`text-xl font-bold ${headCls}`}>{dailyData.spell1}</p></div>
                  <div><p className={`text-[10px] font-bold uppercase ${subCls}`}>Spell 2</p><p className={`text-xl font-bold ${headCls}`}>{dailyData.spell2}</p></div>
                  <div><p className={`text-[10px] font-bold uppercase ${subCls}`}>Spell 3</p><p className={`text-xl font-bold ${headCls}`}>{dailyData.spell3}</p></div>
                </div>
              ) : (
                <div className="text-center"><p className={`text-[10px] font-bold uppercase ${subCls}`}>Total Time</p><p className={`text-3xl font-bold ${headCls}`}>{dailyData.singleTime || 0}</p><p className={`text-xs ${subCls}`}>minutes</p></div>
              )}
            </div>

            {/* Devices */}
            {dailyData.devices && Object.keys(dailyData.devices).length > 0 && (
              <div className={`rounded-xl p-4 ${isGlass ? 'bg-gray-50' : 'bg-[#f5f5f5]'}`}>
                <p className={`text-[10px] font-bold uppercase mb-2 ${subCls}`}><Monitor className="w-3 h-3 inline mr-1" />Other Devices</p>
                {Object.entries(dailyData.devices).map(([name, mins]) => (
                  <div key={name} className="flex justify-between text-sm py-1"><span className={subCls}>{name}</span><span className={`font-bold ${headCls}`}>{mins} min</span></div>
                ))}
              </div>
            )}

            {/* Bonus & Penalty */}
            {(dailyData.bonusMinutes || 0) > 0 && <div className="flex items-center gap-2 text-sm text-green-600 font-semibold"><Gift className="w-4 h-4" /> +{dailyData.bonusMinutes} min bonus</div>}
            {(dailyData.penaltyMinutes || 0) > 0 && <div className="text-sm"><div className="flex items-center gap-2 text-red-600 font-semibold"><AlertTriangle className="w-4 h-4" /> -{dailyData.penaltyMinutes} min penalty</div>{dailyData.penaltyReason && <p className={`text-xs ml-6 ${subCls}`}>{dailyData.penaltyReason}</p>}</div>}

            {/* Total */}
            <div className={`text-center py-3 rounded-xl font-bold ${propTotal > propAdjustedLimit ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {propTotal} / {propAdjustedLimit} min
              {propTotal > propAdjustedLimit ? ` ⚠️ Over by ${propTotal - propAdjustedLimit}` : ` ✅ ${propAdjustedLimit - propTotal} left`}
            </div>
          </div>
        ) : (
          !isFutureDate && <div className={`text-center py-6 rounded-xl ${isGlass ? 'bg-gray-50' : 'bg-[#f5f5f5]'}`}><p className={`text-sm ${subCls}`}>No data entered for this date</p></div>
        )}
      </div>
    );
  }

  // ── ADMIN EDIT VIEW ──
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

        {isFutureDate && <div className={`${isGlass ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-blue-50 border border-blue-200 text-blue-700'} rounded-xl p-4 mb-4 flex items-center gap-3`}><CalendarClock className="w-4 h-4 flex-shrink-0" /><p className="text-sm font-semibold">Future date — view only</p></div>}

        {isFullyBlocked && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3"><Lock className="w-4 h-4 text-red-600" /><div><p className="text-sm font-semibold text-red-600">Fully Blocked</p><p className="text-xs text-red-500">No screen time allowed</p></div></div>}

        {!isFullyBlocked && (
          <div className="space-y-4">
            {/* Screen Time Input */}
            {useSpells ? (
              <div>
                <p className={`text-xs font-bold uppercase mb-2 ${subCls}`}>Screen Time (3 Spells)</p>
                <div className="grid grid-cols-3 gap-3">
                  {[{ l: 'Spell 1', v: spell1, s: setSpell1 }, { l: 'Spell 2', v: spell2, s: setSpell2 }, { l: 'Spell 3', v: spell3, s: setSpell3 }].map(sp => (
                    <div key={sp.l}><label className={`text-xs font-semibold ${subCls}`}>{sp.l}</label><input type="number" value={sp.v || ''} min={0} readOnly={isFutureDate} disabled={isFutureDate} onChange={e => sp.s(Math.max(0, parseInt(e.target.value) || 0))} className={inpCls} /></div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className={`text-xs font-bold uppercase mb-2 ${subCls}`}>Total Screen Time</p>
                <input type="number" value={singleTime || ''} min={0} placeholder="Minutes" readOnly={isFutureDate} disabled={isFutureDate} onChange={e => setSingleTime(Math.max(0, parseInt(e.target.value) || 0))} className={inpCls} />
              </div>
            )}

            {/* Other Devices */}
            <div>
              <p className={`text-xs font-bold uppercase mb-2 ${subCls}`}><Monitor className="w-3 h-3 inline mr-1" />Other Devices</p>
              {Object.entries(devices).map(([name, mins]) => (
                <div key={name} className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-semibold w-24 truncate ${headCls}`}>{name}</span>
                  <input type="number" value={mins || ''} min={0} onChange={e => setDevices(prev => ({ ...prev, [name]: Math.max(0, parseInt(e.target.value) || 0) }))} className={smallInpCls} />
                  <span className={`text-xs ${subCls}`}>min</span>
                  <button onClick={() => setDevices(prev => { const n = { ...prev }; delete n[name]; return n; })} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="TV, iPad, Computer..." className={smallInpCls} onKeyDown={e => e.key === 'Enter' && addDevice()} />
                <button onClick={addDevice} className={`px-3 py-2 rounded-lg text-xs font-semibold ${btnSecondary}`}><Plus className="w-3 h-3" /></button>
              </div>
            </div>

            {/* Bonus Time */}
            <div>
              <p className={`text-xs font-bold uppercase mb-2 text-green-600`}><Gift className="w-3 h-3 inline mr-1" />Bonus Time</p>
              <input type="number" value={bonusMinutes || ''} min={0} placeholder="Extra minutes" onChange={e => setBonusMinutes(Math.max(0, parseInt(e.target.value) || 0))} className={smallInpCls} />
            </div>

            {/* Manual Penalty */}
            <div>
              <p className={`text-xs font-bold uppercase mb-2 text-red-600`}><AlertTriangle className="w-3 h-3 inline mr-1" />Manual Penalty</p>
              <div className="flex gap-2">
                <input type="number" value={penaltyMins || ''} min={0} placeholder="Minutes" onChange={e => setPenaltyMins(Math.max(0, parseInt(e.target.value) || 0))} className={smallInpCls + ' w-24'} />
                <input value={penaltyReason} onChange={e => setPenaltyReason(e.target.value)} placeholder="Reason (e.g. complaint)" className={smallInpCls} />
              </div>
            </div>

            {/* Total Summary */}
            <div className={`text-center py-3 rounded-xl font-bold text-sm ${isOverLimit ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              Screen: {screenTotal} + Devices: {deviceTotal}
              {bonusMinutes > 0 && <span className="text-green-600"> + {bonusMinutes} bonus</span>}
              {penaltyMins > 0 && <span className="text-red-500"> − {penaltyMins} penalty</span>}
              {' = '}<strong>{total}</strong> / {adjustedLimit} min
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={requestSave} disabled={disableEditing} className={`py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 ${btnPrimary}`}><Save className="w-4 h-4" /> Save</button>
              <button onClick={requestReset} disabled={isFutureDate} className={`py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 ${btnSecondary}`}><RotateCcw className="w-4 h-4" /> Reset</button>
            </div>

            <button onClick={onOverride} className="w-full py-2.5 rounded-lg bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 border border-red-200/50 flex items-center justify-center gap-2"><ShieldAlert className="w-4 h-4" /> Admin Override</button>
          </div>
        )}
      </div>
      {modals}
    </>
  );
}
