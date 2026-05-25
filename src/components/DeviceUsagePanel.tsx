import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { fetchDeviceUsage, type DeviceUsageRow } from '../db/sync';

interface DeviceUsagePanelProps {
  userKey: string | null;
}

const APP_NAMES: Record<string, string> = {
  'com.mojang.minecraftpe': '🎮 Minecraft',
  'com.google.android.youtube': '▶️ YouTube',
  'com.netflix.mediaclient': '🎬 Netflix',
  'com.instagram.android': '📸 Instagram',
  'com.whatsapp': '💬 WhatsApp',
  'com.spotify.music': '🎵 Spotify',
  'com.zhiliaoapp.musically': '🎵 TikTok',
  'com.google.android.apps.maps': '🗺️ Maps',
  'com.android.chrome': '🌐 Chrome',
  'com.roblox.client': '🎮 Roblox',
};

function friendlyName(pkg: string): string {
  if (APP_NAMES[pkg]) return APP_NAMES[pkg];
  const parts = pkg.split('.');
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export default function DeviceUsagePanel({ userKey }: DeviceUsagePanelProps) {
  const { theme } = useTheme();
  const isGlass = theme === 'glass';

  const [data, setData] = useState<DeviceUsageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const loadData = async () => {
    if (!userKey) return;
    setLoading(true);
    try {
      const rows = await fetchDeviceUsage(userKey);
      setData(rows);
      setLastFetched(new Date());
    } catch (err) {
      console.warn('Device usage fetch failed (table may not exist yet):', err);
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userKey]);

  const todayKey = new Date().toISOString().split('T')[0];
  const todayData = data.find(d => d.date === todayKey);
  const hasData = data.length > 0;
  const hasToday = !!todayData;

  const barColors = [
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-pink-400',
    'from-orange-500 to-amber-400',
    'from-green-500 to-emerald-400',
    'from-red-500 to-rose-400',
    'from-indigo-500 to-violet-400',
  ];

  /* ═══ CLASSIC ═══ */
  if (!isGlass) {
    return (
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#0f0f0f]" />
            <div>
              <h3 className="text-lg font-semibold text-[#0f0f0f]">Device Usage</h3>
              <p className="text-xs text-[#999]">Auto-synced from phone</p>
            </div>
          </div>
          <button onClick={loadData} disabled={loading}
            className="p-2 rounded-lg border border-[#e5e5e5] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-[#666] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!hasData && (
          <div className="text-center py-8">
            <WifiOff className="w-8 h-8 text-[#ccc] mx-auto mb-3" />
            <p className="text-sm text-[#999]">No device data yet</p>
            <p className="text-xs text-[#bbb] mt-1">Install the tracker app on the phone to start syncing</p>
          </div>
        )}

        {hasToday && todayData && (
          <>
            <div className={`text-center p-4 rounded-xl mb-4 ${todayData.minutes_played > 60 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className={`text-3xl font-bold ${todayData.minutes_played > 60 ? 'text-red-500' : 'text-blue-600'}`}>
                {todayData.minutes_played}
              </div>
              <div className="text-xs text-[#666] mt-1">minutes on phone today</div>
            </div>

            {todayData.app_breakdown && Object.keys(todayData.app_breakdown).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.entries(todayData.app_breakdown)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([pkg, mins], idx) => {
                    const m = mins as number;
                    const maxMins = Math.max(...Object.values(todayData.app_breakdown!).map(v => v as number));
                    const pct = maxMins > 0 ? (m / maxMins) * 100 : 0;
                    return (
                      <div key={pkg} className="flex items-center gap-3">
                        <div className="w-28 text-xs font-semibold text-[#0f0f0f] truncate">{friendlyName(pkg)}</div>
                        <div className="flex-1 bg-[#f0f0f0] rounded-full h-5 overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${barColors[idx % barColors.length]}`}
                            style={{ width: `${pct}%`, minWidth: m > 0 ? '8px' : '0' }} />
                        </div>
                        <div className="w-12 text-right text-xs font-bold text-[#333]">{m}m</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {hasData && (
          <div className="border-t border-[#e5e5e5] pt-4 mt-4">
            <p className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-3">Last 7 Days</p>
            <div className="flex items-end gap-2" style={{ height: '80px' }}>
              {data.slice().reverse().map((row, _i) => {
                const maxMins = Math.max(...data.map(d => d.minutes_played), 60);
                const h = maxMins > 0 ? (row.minutes_played / maxMins) * 100 : 0;
                const day = new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                const isOver = row.minutes_played > 60;
                return (
                  <div key={row.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-bold ${isOver ? 'text-red-500' : 'text-[#333]'}`}>{row.minutes_played || '–'}</span>
                    <div className="w-full bg-[#f0f0f0] rounded-t" style={{ height: `${h}%`, minHeight: '2px' }}>
                      <div className={`w-full h-full rounded-t ${isOver ? 'bg-red-400' : 'bg-[#0f0f0f]'}`} />
                    </div>
                    <span className="text-[9px] text-[#999]">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lastFetched && (
          <p className="text-[10px] text-[#ccc] mt-3 flex items-center gap-1">
            <Wifi className="w-3 h-3" /> Updated {lastFetched.toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  }

  /* ═══ GLASS ═══ */
  return (
    <div className="glass-card p-6 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Device Usage</h3>
            <p className="text-xs text-gray-400 font-medium">Auto-synced from phone</p>
          </div>
        </div>
        <button onClick={loadData} disabled={loading}
          className="w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-gray-200/50 flex items-center justify-center transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!hasData && (
        <div className="text-center py-10">
          <WifiOff className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">No device data yet</p>
          <p className="text-xs text-gray-400 mt-1">Install the tracker app on the phone to start</p>
        </div>
      )}

      {hasToday && todayData && (
        <>
          <div className="flex flex-col items-center mb-5">
            <div className="relative w-28 h-28 mb-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <motion.circle cx="60" cy="60" r="50" fill="none"
                  stroke={todayData.minutes_played > 60 ? '#ef4444' : '#8b5cf6'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - Math.min(1, todayData.minutes_played / 60)) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-extrabold ${todayData.minutes_played > 60 ? 'text-red-500' : 'text-gray-900'}`}>
                  {todayData.minutes_played}
                </span>
                <span className="text-[9px] text-gray-400 font-semibold">min today</span>
              </div>
            </div>
          </div>

          {todayData.app_breakdown && Object.keys(todayData.app_breakdown).length > 0 && (
            <div className="space-y-2.5 mb-5">
              {Object.entries(todayData.app_breakdown)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([pkg, mins], idx) => {
                  const m = mins as number;
                  const maxMins = Math.max(...Object.values(todayData.app_breakdown!).map(v => v as number));
                  const pct = maxMins > 0 ? (m / maxMins) * 100 : 0;
                  return (
                    <motion.div key={pkg} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3">
                      <div className="w-28 text-xs font-semibold text-gray-700 truncate">{friendlyName(pkg)}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.1 }}
                          className={`h-full rounded-full bg-gradient-to-r ${barColors[idx % barColors.length]}`}
                          style={{ minWidth: m > 0 ? '8px' : '0' }} />
                      </div>
                      <div className="w-12 text-right text-xs font-bold text-gray-600">{m}m</div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {hasData && (
        <div className="border-t border-gray-200/50 pt-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last 7 Days</p>
          </div>
          <div className="flex items-end gap-2" style={{ height: '80px' }}>
            {data.slice().reverse().map((row, i) => {
              const maxMins = Math.max(...data.map(d => d.minutes_played), 60);
              const h = maxMins > 0 ? (row.minutes_played / maxMins) * 100 : 0;
              const day = new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
              const isOver = row.minutes_played > 60;
              return (
                <div key={row.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-bold ${isOver ? 'text-red-500' : 'text-gray-600'}`}>{row.minutes_played || '–'}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className={`w-full rounded-t-lg ${
                      isOver
                        ? 'bg-gradient-to-t from-red-500 to-orange-400'
                        : 'bg-gradient-to-t from-violet-500 to-purple-400'
                    }`}
                    style={{ minHeight: '2px' }} />
                  <span className="text-[9px] text-gray-400 font-semibold">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lastFetched && (
        <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
          <Wifi className="w-3 h-3" /> Updated {lastFetched.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
