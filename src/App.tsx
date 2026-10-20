import { useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Sparkles, LogOut, Shield, Settings2 } from 'lucide-react';
import Calendar from './components/Calendar';
import SpellInput from './components/SpellInput';
import StatsPanel from './components/StatsPanel';
import OverrideModal from './components/OverrideModal';
import ThemeToggle from './components/ThemeToggle';
import LoginPage from './components/LoginPage';
import WeeklyChart from './components/WeeklyChart';
import BehaviorScore from './components/BehaviorScore';
import DbSetupScreen from './components/DbSetupScreen';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import SettingsPanel from './components/SettingsPanel';
import DeviceUsagePanel from './components/DeviceUsagePanel';
import { ThemeProvider, useTheme } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';
import { useStore, getDateKey } from './useStore';
import { CLOUD_ENABLED } from './db/supabase';

function Dashboard() {
  const { theme } = useTheme();
  const isGlass = theme === 'glass';
  const { user, logout, isAdmin } = useAuth();

  const userKey = user?.key || null;

  const {
    state, syncStatus, lastSynced, cloudEnabled,
    selectDate, setMonth, getDailyData,
    updateSpells, resetSpells, overrideBlock, getPenaltyInfo, isBlocked,
    getWeeklyStats, getBehaviorScore,
    updateSettings, resetAllData, replaceState, forceSync,
  } = useStore(userKey);

  const [showOverride, setShowOverride] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const selectedData = getDailyData(state.selectedDate);
  const penaltyInfo = getPenaltyInfo(state.selectedDate);
  const blockStatus = isBlocked(state.selectedDate);
  const weeklyStats = getWeeklyStats();
  const behaviorScore = getBehaviorScore();

  const handleOverride = (dateKey: string, password: string): boolean => {
    return overrideBlock(dateKey, password);
  };

  const todayKey = getDateKey(new Date());
  const todayPenalty = getPenaltyInfo(todayKey);
  const isFutureSelected = state.selectedDate > todayKey;

  const userInitial = user?.username?.charAt(0).toUpperCase() || '?';

  const syncIndicator = (
    <SyncStatusIndicator
      status={syncStatus}
      lastSynced={lastSynced}
      cloudEnabled={cloudEnabled}
    />
  );

  /* ════════════════════════════════════
     CLASSIC LAYOUT — Brevo-inspired: lime hero band, deep-ink pill
     buttons/avatars, soft rounded cards. Same data/props as before;
     only the shell markup and classes changed.
     ════════════════════════════════════ */
  if (!isGlass) {
    return (
      <div className="min-h-screen bg-white text-[#15241D]" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div className="max-w-[1360px] mx-auto px-6 py-7">

          {/* Top nav */}
          <div className="flex items-center justify-between mb-7 gap-3 flex-wrap">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-extrabold tracking-tight text-brevo-teal">STLOG</span>
              <span className="text-xl font-extrabold tracking-tight">Track</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {syncIndicator}
              <ThemeToggle />
              <button onClick={() => setShowSettings(true)} title="Settings"
                className="w-9 h-9 rounded-full border border-brevo-border bg-white hover:bg-brevo-field flex items-center justify-center transition-colors text-[#4B5C53] hover:text-brevo-ink">
                <Settings2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border border-brevo-border rounded-full pl-1.5 pr-2.5 py-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  isAdmin ? 'bg-brevo-ink' : 'bg-[#8A9A8F]'
                }`}>
                  {userInitial}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold leading-tight">{user?.username}</div>
                  <div className="text-[10px] text-[#8A9A8F] leading-tight">{isAdmin ? 'Admin' : 'User'}</div>
                </div>
                <button onClick={logout} title="Sign out"
                  className="ml-1 p-1.5 rounded-full hover:bg-brevo-field transition-colors text-[#9AA89E] hover:text-brevo-ink">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="bg-brevo-lime rounded-[32px] px-8 sm:px-10 py-9 sm:py-11 mb-7 flex flex-wrap items-center gap-8">
            <div className="flex-1 min-w-[280px]">
              <div className="text-[11px] font-extrabold tracking-[0.12em] text-brevo-teal mb-3 uppercase">Screen time, simplified</div>
              <h1 className="text-[28px] sm:text-[34px] leading-[1.15] font-extrabold tracking-tight text-brevo-ink mb-3">
                Hello, {user?.username} — here's today's progress
              </h1>
              <p className="text-[15px] text-[#33493D] max-w-md mb-5">
                Track daily usage, manage penalties, and keep screen time fair.
              </p>
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F3A2C]">
                <span className={`w-2 h-2 rounded-full ${
                  todayPenalty.totalTime > todayPenalty.effectiveLimit ? 'bg-red-500' : 'bg-[#2DA86B]'
                }`} />
                {todayPenalty.totalTime} / {todayPenalty.effectiveLimit} min used today
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            <div className="space-y-6">
              <SpellInput
                dateKey={state.selectedDate}
                dailyData={selectedData}
                isFullyBlocked={blockStatus.fullBlock}
                blockedMinutes={blockStatus.minutes}
                effectiveLimit={penaltyInfo.effectiveLimit}
                isFutureDate={isFutureSelected}
                onUpdate={updateSpells}
                onReset={resetSpells}
                onOverride={() => setShowOverride(true)}
                isAdmin={isAdmin}
              />
              <Calendar
                month={state.currentMonth}
                year={state.currentYear}
                selectedDate={state.selectedDate}
                blockedDates={state.blockedDates}
                onSelectDate={selectDate}
                onChangeMonth={setMonth}
              />
            </div>

            <div className="space-y-6">
              <StatsPanel
                penaltyInfo={penaltyInfo}
                dailyData={selectedData}
                isBlocked={blockStatus.blocked}
                isFullBlock={blockStatus.fullBlock}
                blockedMinutes={blockStatus.minutes}
              />
              <BehaviorScore
                score={behaviorScore.score}
                grade={behaviorScore.grade}
                label={behaviorScore.label}
                onTimePct={behaviorScore.onTimePct}
                avgPenalty={behaviorScore.avgPenalty}
              />
              <DeviceUsagePanel userKey={userKey} mobileSync={state.settings.mobileSync ?? false} />
            </div>
          </div>

          <div className="mt-6">
            <WeeklyChart stats={weeklyStats} />
          </div>

          <div className="text-center text-[11px] text-[#9AA89E] mt-10 pb-2 leading-relaxed">
            Exceeding limit incurs 1.5× penalty &nbsp;·&nbsp; Penalty ≥ 60 min fully blocks next day &amp; carries forward &nbsp;·&nbsp; Penalty &lt; 60 min reduces next day's limit
          </div>
        </div>

        <OverrideModal
          isOpen={showOverride}
          dateKey={state.selectedDate}
          onClose={() => setShowOverride(false)}
          onConfirm={handleOverride}
        />

        <SettingsPanel
          isOpen={showSettings}
          settings={state.settings}
          cloudEnabled={cloudEnabled}
          lastSynced={lastSynced}
          onClose={() => setShowSettings(false)}
          onSaveSettings={updateSettings}
          onResetData={resetAllData}
          onReplaceData={replaceState}
          onForceSync={forceSync}
          onReconfigureCloud={() => window.location.reload()}
        />
      </div>
    );
  }

  /* ════════════════════════════════════
     GLASS LAYOUT
     ════════════════════════════════════ */
  return (
    <div className="min-h-screen gradient-mesh">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-30 backdrop-blur-2xl bg-white/70 border-b border-gray-200/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-lg shadow-gray-900/15">
                <Monitor className="w-4.5 h-4.5 text-white" />
              </div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-900">Screen Time</h1>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 bg-gray-100/80 rounded-full px-3.5 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600">
                  {todayPenalty.totalTime} / {todayPenalty.effectiveLimit} min
                </span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                todayPenalty.totalTime > todayPenalty.effectiveLimit ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`} />

              {syncIndicator}
              <ThemeToggle />
              <button onClick={() => setShowSettings(true)} title="Settings"
                className="w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-gray-200/50 flex items-center justify-center transition-all text-gray-500 hover:text-gray-900 hover:scale-105 active:scale-95">
                <Settings2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-gray-200/50 rounded-full pl-1.5 pr-2 py-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md ${
                  isAdmin
                    ? 'bg-gradient-to-br from-gray-900 to-gray-700'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                }`}>
                  {userInitial}
                </div>
                <div className="hidden sm:block pr-1">
                  <div className="text-xs font-semibold text-gray-800 leading-tight">{user?.username}</div>
                  <div className="flex items-center gap-1">
                    {isAdmin && <Shield className="w-2.5 h-2.5 text-gray-400" />}
                    <span className="text-[9px] text-gray-400 font-medium leading-tight">{isAdmin ? 'Admin' : 'User'}</span>
                  </div>
                </div>
                <button onClick={logout} title="Sign out"
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-200/60 transition-colors text-gray-400 hover:text-gray-700">
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <SpellInput
              dateKey={state.selectedDate}
              dailyData={selectedData}
              isFullyBlocked={blockStatus.fullBlock}
              blockedMinutes={blockStatus.minutes}
              effectiveLimit={penaltyInfo.effectiveLimit}
              isFutureDate={isFutureSelected}
              onUpdate={updateSpells}
              onReset={resetSpells}
              onOverride={() => setShowOverride(true)}
              isAdmin={isAdmin}
            />
            <Calendar
              month={state.currentMonth}
              year={state.currentYear}
              selectedDate={state.selectedDate}
              blockedDates={state.blockedDates}
              onSelectDate={selectDate}
              onChangeMonth={setMonth}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <StatsPanel
              penaltyInfo={penaltyInfo}
              dailyData={selectedData}
              isBlocked={blockStatus.blocked}
              isFullBlock={blockStatus.fullBlock}
              blockedMinutes={blockStatus.minutes}
            />
            <BehaviorScore
              score={behaviorScore.score}
              grade={behaviorScore.grade}
              label={behaviorScore.label}
              onTimePct={behaviorScore.onTimePct}
              avgPenalty={behaviorScore.avgPenalty}
            />
              <DeviceUsagePanel userKey={userKey} mobileSync={state.settings.mobileSync ?? false} />
          </div>
        </div>

        <div className="mt-6">
          <WeeklyChart stats={weeklyStats} />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-12 text-center">
          <p className="text-xs text-gray-400 font-medium">
            Exceeding limit incurs 1.5× penalty • Penalty ≥ 60 min fully blocks next day &amp; carries forward • Penalty &lt; 60 min reduces next day's limit
          </p>
        </motion.div>
      </main>

      <OverrideModal
        isOpen={showOverride}
        dateKey={state.selectedDate}
        onClose={() => setShowOverride(false)}
        onConfirm={handleOverride}
      />

      <SettingsPanel
        isOpen={showSettings}
        settings={state.settings}
        cloudEnabled={cloudEnabled}
        lastSynced={lastSynced}
        onClose={() => setShowSettings(false)}
        onSaveSettings={updateSettings}
        onResetData={resetAllData}
        onReplaceData={replaceState}
        onForceSync={forceSync}
        onReconfigureCloud={() => window.location.reload()}
      />
    </div>
  );
}

function DeletedScreen() {
  const { deletedMessage, submitRequest, logout } = useAuth();
  const { theme } = useTheme();
  const isGlass = theme === 'glass';
  const [appeal, setAppeal] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isGlass ? 'gradient-mesh' : 'bg-white'}`}>
      <div className={`w-full max-w-md ${isGlass ? 'glass-card p-8' : 'bg-white border border-[#e5e5e5] rounded-xl p-8'}`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className={`text-2xl font-bold ${isGlass ? 'text-gray-900' : 'text-[#0f0f0f]'}`}>Account Removed</h1>
          <p className={`text-sm mt-2 ${isGlass ? 'text-gray-500' : 'text-[#666]'}`}>{deletedMessage}</p>
        </div>

        {!sent ? (
          <div className="space-y-3">
            <textarea
              value={appeal}
              onChange={e => setAppeal(e.target.value)}
              placeholder="Write an appeal to the admin..."
              rows={3}
              className={`w-full px-4 py-3 rounded-xl border text-sm ${isGlass ? 'bg-gray-50 border-gray-200/80 focus:ring-2 focus:ring-gray-900/10' : 'bg-[#fafafa] border-[#e5e5e5] focus:border-[#0f0f0f]'} focus:outline-none`}
            />
            <button
              onClick={() => {
                if (appeal.trim()) {
                  submitRequest({ type: 'appeal', message: appeal });
                  setSent(true);
                }
              }}
              className={`w-full py-3 rounded-xl font-semibold text-sm ${isGlass ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-[#0f0f0f] text-white hover:bg-[#333]'}`}
            >
              Submit Appeal
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-green-700">✅ Appeal submitted!</p>
            <p className="text-xs text-green-600 mt-1">The admin will review your appeal.</p>
          </div>
        )}

        <button onClick={logout} className={`w-full mt-4 py-2 rounded-xl font-semibold text-sm ${isGlass ? 'bg-gray-100 text-gray-700' : 'border border-[#e5e5e5] text-[#666]'}`}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AppInner() {
  const { user, isDeleted } = useAuth();
  const [showSetup, setShowSetup] = useState(false);

  const setupDismissed = localStorage.getItem('screentime_setup_skipped') === 'true';

  if (!user) {
    return <LoginPage />;
  }

  // Show deleted screen if user was removed by admin
  if (isDeleted) {
    return <DeletedScreen />;
  }

  if (!CLOUD_ENABLED && !setupDismissed || showSetup) {
    return (
      <DbSetupScreen
        onComplete={() => {
          localStorage.removeItem('screentime_setup_skipped');
          setShowSetup(false);
          window.location.reload();
        }}
        onSkip={() => {
          localStorage.setItem('screentime_setup_skipped', 'true');
          setShowSetup(false);
        }}
      />
    );
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
