import { motion } from 'framer-motion';
import { Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SyncStatus } from '../useStore';
import { useTheme } from '../ThemeContext';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSynced: Date | null;
  cloudEnabled: boolean;
}

export default function SyncStatusIndicator({ status, lastSynced, cloudEnabled }: SyncStatusIndicatorProps) {
  const { theme } = useTheme();
  const isGlass = theme === 'glass';

  if (!cloudEnabled) {
    return (
      <div className={`flex items-center gap-1.5 text-[10px] font-medium ${isGlass ? 'text-gray-400' : 'text-[#999]'}`}
        title="Cloud not configured — using local storage">
        <CloudOff className="w-3 h-3" />
        <span className="hidden sm:inline">Local only</span>
      </div>
    );
  }

  const statusMap: Record<SyncStatus, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; spin?: boolean }> = {
    idle: { icon: Cloud, label: 'Ready', color: isGlass ? 'text-gray-400' : 'text-[#999]' },
    loading: { icon: Loader2, label: 'Loading', color: 'text-blue-500', spin: true },
    syncing: { icon: Loader2, label: 'Saving', color: 'text-blue-500', spin: true },
    synced: { icon: CheckCircle2, label: 'Synced', color: 'text-green-500' },
    error: { icon: AlertCircle, label: 'Error', color: 'text-red-500' },
    offline: { icon: CloudOff, label: 'Offline', color: 'text-orange-500' },
    'cloud-only': { icon: Cloud, label: 'Cloud', color: 'text-blue-500' },
  };

  const s = statusMap[status] || statusMap.idle;
  const Icon = s.icon;

  const lastSyncedLabel = lastSynced
    ? `Last synced ${formatRelative(lastSynced)}`
    : 'Not yet synced';

  // Classic: match the mockup's pill exactly (bg #F1F8EC, border #E3EFDC, pill radius,
  // 7px/14px padding) and show the relative time inline — "Synced 2m ago" — not just
  // "Synced", with the time hidden in a hover tooltip.
  const displayLabel = !isGlass && status === 'synced' && lastSynced
    ? `${s.label} ${formatRelative(lastSynced)}`
    : s.label;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-1.5 text-[10px] font-medium rounded-full ${
        isGlass ? 'bg-white/50 px-2.5 py-1 ' + s.color : 'bg-[#F1F8EC] border border-[#E3EFDC] px-3.5 py-[7px] text-[12.5px] font-semibold text-[#2C4A3B]'
      }`}
      title={lastSyncedLabel}
    >
      <Icon className={`${isGlass ? 'w-3 h-3' : 'w-3.5 h-3.5 text-brevo-teal'} ${s.spin ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">{displayLabel}</span>
    </motion.div>
  );
}

function formatRelative(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}
