export interface Repository {
  id: string;
  name: string;
  owner: string;
  enabled: boolean;
  allowedBranches: string[];
  allowedUsers: string[];
  allowAllBranches?: boolean;
  allowAllUsers?: boolean;
  alertsEnabled: boolean;
  apiKeyId?: string;
  fetchMode?: 'no-auth' | 'github-api';
  webhookMethod?: 'global' | 'custom' | 'disabled';
  webhookUrl?: string;
  lastActivity?: Date;
  recentPull?: {
    number: number;
    title: string;
    status: 'merged' | 'pending' | 'failed';
    timestamp: Date;
  };
  stats: {
    totalMerges: number;
    successfulMerges: number;
    failedMerges: number;
    pendingMerges: number;
  };
  activities: ActivityItem[];
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: Date;
  lastUsed?: Date;
  isActive: boolean;
  encrypted: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'merge' | 'pull' | 'alert' | 'success' | 'failure';
  message: string;
  repo: string;
  timestamp: Date;
  details?: any;
}

export interface MergeStats {
  session: {
    pending: number;
    merged: number;
    failed: number;
  };
  total: {
    pending: number;
    merged: number;
    failed: number;
  };
}

export interface GlobalConfig {
  autoMergeEnabled: boolean;
  requireApproval: boolean;
  alertsEnabled: boolean;
  encryptionEnabled: boolean;
  defaultBranchPatterns: string[];
  defaultAllowedUsers: string[];
  alertThreshold: number;
  maxRetries: number;
  autoDeleteBranch: boolean;
  allowAllBranches: boolean;
  allowAllUsers: boolean;
  fetchMode: 'no-auth' | 'github-api';
}