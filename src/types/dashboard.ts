export interface Repository {
  id: string;
  name: string;
  owner: string;
  enabled: boolean;
  /** Automatically merge PRs when merge state is clean */
  autoMergeOnClean: boolean;
  /** Automatically merge PRs when merge state is unstable */
  autoMergeOnUnstable?: boolean;
  /** Whether this repository should be included in watch mode */
  watchEnabled?: boolean;
  /** Delete stray branches with dirty history automatically */
  autoDeleteOnDirty?: boolean;
  /** Close stale branches automatically */
  autoCloseBranch?: boolean;
  allowedBranches: string[];
  /** Branch patterns that should be hidden from stray branch lists */
  protectedBranches?: string[];
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
  requireApproval: boolean;
  alertsEnabled: boolean;
  encryptionEnabled: boolean;
  defaultBranchPatterns: string[];
  defaultAllowedUsers: string[];
  alertThreshold: number;
  maxRetries: number;
  /** Automatically merge when PR state is clean */
  autoMergeOnClean: boolean;
  /** Automatically merge when PR state is unstable */
  autoMergeOnUnstable: boolean;
  /** Automatically delete dirty stray branches */
  autoDeleteOnDirty: boolean;
  allowAllBranches: boolean;
  allowAllUsers: boolean;
  fetchMode: 'no-auth' | 'github-api';
  serverCheckInterval: number;
  logLevel: 'info' | 'warn' | 'error' | 'debug';
  darkMode: boolean;
  bwMode: boolean;
  accentColor: string;
  customCss: string;
  customJs: string;
  feedActions: FeedAction[];
  statsPeriod: StatsPeriod;
  webhooks: Webhook[];
  hideHeader: boolean;
  logsDisabled: boolean;
  protectedBranches: string[];
  confirmBranchDeletion: boolean;
  /** Archive PRs automatically when closing */
  autoArchiveClose: boolean;
  /** Archive already closed PRs when fetching */
  autoArchiveClosed: boolean;
  refreshInterval: number;
  /** Socket server hostname or IP (defaults to 'localhost') */
  socketServerAddress: string;
  /** Socket server port (defaults to 8080) */
  socketServerPort: number;
  /** Socket reconnection attempts (defaults to 5) */
  socketMaxRetries: number;
  /** Current socket connection status */
  socketConnected: boolean;
  /** Measured socket latency in milliseconds */
  latencyMs: number;
}
