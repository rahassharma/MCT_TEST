export interface DailyData {
  spell1: number;
  spell2: number;
  spell3: number;
}

export interface AppSettings {
  maxTime: number;
  penaltyRatio: number;
  fullBlockThreshold: number;
  carryForwardEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxTime: 60,
  penaltyRatio: 1.5,
  fullBlockThreshold: 60,
  carryForwardEnabled: true,
};

export interface PenaltyInfo {
  totalTime: number;
  effectiveLimit: number;
  bonusTime: number;
  excessTime: number;
  penaltyMinutes: number;
  isFullBlock: boolean;
  carryForward: number;
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

export type RequestType = 'password_reset' | 'recommend_user' | 'suggestion';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface PasswordResetRequest {
  id: string;
  type: 'password_reset';
  userKey: string;
  userDisplay: string;
  desiredPassword: string;
  timestamp: string;
  status: RequestStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface RecommendUserRequest {
  id: string;
  type: 'recommend_user';
  userKey: string;          // who recommended
  userDisplay: string;
  recommendedKey: string;   // new user login key
  recommendedDisplay: string; // new user display name
  recommendedPassword: string;
  timestamp: string;
  status: RequestStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface SuggestionRequest {
  id: string;
  type: 'suggestion';
  userKey: string;
  userDisplay: string;
  message: string;
  timestamp: string;
  status: RequestStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  adminReply?: string;
}

export type UserRequest = PasswordResetRequest | RecommendUserRequest | SuggestionRequest;

// ── Notifications ──

export interface AdminNotification {
  id: string;
  targetUserKey: string;   // who receives it ('all' for everyone)
  fromAdmin: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  timestamp: string;
  readBy: string[];        // user keys who have read it
}
