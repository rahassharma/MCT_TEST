export interface DailyData {
  spell1: number;
  spell2: number;
  spell3: number;
  singleTime?: number;           // NEW: single time entry (if useSpells is false)
  bonusMinutes?: number;         // NEW: admin-granted bonus time
  penaltyMinutes?: number;       // NEW: admin-applied manual penalty
  penaltyReason?: string;        // NEW: why penalty was applied
  devices?: Record<string, number>;  // NEW: per-device time (e.g. {"TV": 30, "iPad": 15})
}

export interface AppSettings {
  maxTime: number;
  penaltyRatio: number;
  fullBlockThreshold: number;
  carryForwardEnabled: boolean;
  mobileSync: boolean;
  useSpells: boolean;            // NEW: true = 3 spells, false = single time entry
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxTime: 60, penaltyRatio: 1.5, fullBlockThreshold: 60,
  carryForwardEnabled: true, mobileSync: false, useSpells: true,
};

export interface PenaltyInfo {
  totalTime: number; effectiveLimit: number; bonusTime: number;
  excessTime: number; penaltyMinutes: number; isFullBlock: boolean; carryForward: number;
}

export interface AppState {
  dailyData: Record<string, DailyData>;
  blockedDates: Record<string, number>;
  selectedDate: string;
  currentMonth: number;
  currentYear: number;
  settings: AppSettings;
}

// ── Request System ──

export type RequestType = 'password_reset' | 'recommend_user' | 'suggestion' | 'appeal' | 'role_upgrade' | 'complaint';
export type RequestStatus = 'submitted' | 'received' | 'reviewing' | 'editing' | 'approved' | 'rejected' | 'appealed';

export interface UserRequest {
  id: string;
  type: RequestType;
  trackingNo: string;
  userKey: string;
  userDisplay: string;
  status: RequestStatus;
  timestamp: string;
  desiredPassword?: string;
  recommendedKey?: string;
  recommendedDisplay?: string;
  recommendedPassword?: string;
  message?: string;
  desiredRole?: string;
  // Complaint specific
  complainAbout?: string;        // who the complaint is about
  complainReason?: string;
  requestedPenalty?: number;     // minutes of penalty requested
  adminNote?: string;
  editRequest?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  appealMessage?: string;
  appealTimestamp?: string;
  history: Array<{ status: RequestStatus; timestamp: string; by: string; note?: string; }>;
}

// ── Notifications ──

export interface AdminNotification {
  id: string;
  targetUserKey: string;
  fromAdmin: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  timestamp: string;
  readBy: string[];
}
