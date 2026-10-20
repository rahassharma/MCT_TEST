export interface DailyData {
  spell1: number; spell2: number; spell3: number;
  /** Minutes auto-reported by the phone-side Guardian app (verified supervised-profile usage,
   *  plus any PIN bonus-time grants). Optional for backward compatibility with older records. */
  deviceMinutes?: number;
}

export interface AppSettings {
  maxTime: number;
  penaltyRatio: number;
  fullBlockThreshold: number;
  carryForwardEnabled: boolean;
  mobileSync: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxTime: 60, penaltyRatio: 1.5, fullBlockThreshold: 60,
  carryForwardEnabled: true, mobileSync: false,
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

// ── Request Tracking System ──

export type RequestType = 'password_reset' | 'recommend_user' | 'suggestion' | 'appeal' | 'role_upgrade';

// Multi-step workflow statuses
export type RequestStatus =
  | 'submitted'       // User submitted — waiting for admin to receive
  | 'received'        // Admin clicked "Receive" — acknowledged
  | 'reviewing'       // Admin is reviewing
  | 'editing'         // Sent back for edits (admin requested changes)
  | 'approved'        // Final: approved
  | 'rejected'        // Final: rejected
  | 'appealed';       // User appealed the decision

export interface UserRequest {
  id: string;
  type: RequestType;
  trackingNo: string;          // e.g. REQ-001
  userKey: string;
  userDisplay: string;
  status: RequestStatus;
  timestamp: string;

  // Type-specific data
  desiredPassword?: string;     // password_reset
  recommendedKey?: string;      // recommend_user
  recommendedDisplay?: string;  // recommend_user
  recommendedPassword?: string; // recommend_user
  message?: string;             // suggestion, appeal, role_upgrade
  desiredRole?: string;         // role_upgrade

  // Admin actions
  adminNote?: string;           // Admin's note/reply at any step
  editRequest?: string;         // What admin wants user to change
  resolvedAt?: string;
  resolvedBy?: string;

  // Appeal
  appealMessage?: string;       // User's appeal after rejection
  appealTimestamp?: string;

  // Status history
  history: Array<{
    status: RequestStatus;
    timestamp: string;
    by: string;
    note?: string;
  }>;
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
