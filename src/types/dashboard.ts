export interface Repository {
  id: string;
  name: string;
  owner: string;
  enabled: boolean;
  autoMergeEnabled: boolean;
  allowedBranches: string[];
  allowedUsers: string[];
  allowAllBranches?: boolean;
  allowAllUsers?: boolean;
  alertsEnabled: boolean;
  apiKeyId?: string;
  fetchMode?: 'no-auth' | 'github-api' | 'global';
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
  connectionStatus?: 'connected' | 'disconnected' | 'testing';
}

export interface ActivityItem {
  id: string;
  type: 'merge' | 'pull' | 'alert' | 'success' | 'failure';
  message: string;
  repo: string;
  timestamp: Date;
  details?: any;
}

export interface Activity {
  id: string;
  type: 'merged' | 'pull_request' | 'alert' | 'merge_failed';
  message: string;
  repository: string;
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

export interface FeedAction {
  id: string;
  name: string;
  eventType: 'merge' | 'pull' | 'alert' | 'success' | 'failure' | 'all';
  actionType: 'webhook' | 'email' | 'slack';
  endpoint: string;
  enabled: boolean;
}

export type StatsPeriod = 'session' | 'day' | 'week' | 'month' | 'year' | 'all-time';

export interface DetailedStats {
  period: StatsPeriod;
  repositories: {
    [repoId: string]: {
      name: string;
      merges: number;
      successes: number;
      failures: number;
      pullRequests: number;
      alerts: number;
      avgMergeTime: number;
      dailyStats: {
        [date: string]: {
          merges: number;
          successes: number;
          failures: number;
        };
      };
    };
  };
  overall: {
    totalMerges: number;
    totalSuccesses: number;
    totalFailures: number;
    totalPullRequests: number;
    totalAlerts: number;
    avgSuccessRate: number;
    topRepository: string;
    peakDay: string;
  };
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
  headers?: Record<string, string>;
  created: Date;
  lastUsed?: Date;
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
  serverCheckInterval: number;
  logLevel: 'info' | 'warn' | 'error' | 'debug';
  darkMode: boolean;
  customCss: string;
  customJs: string;
  feedActions: FeedAction[];
  statsPeriod: StatsPeriod;
  webhooks: Webhook[];
  hideHeader: boolean;
  logsDisabled: boolean;
}