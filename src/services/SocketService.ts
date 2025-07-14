import { BasicSocket } from './BasicSocket';
import { logger, Logger } from './Logger';

export interface PairingRequest {
  id: string;
  clientId: string;
  timestamp: Date;
  approved: boolean;
}

export interface SocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  clientId?: string;
}

export interface ServerAction {
  type: 'merge' | 'close' | 'approve' | 'comment' | 'check-status';
  payload: any;
  apiKeyId: string;
  repositoryId: string;
}

export class SocketService {
  private static instance: SocketService;
  private socket: BasicSocket | null = null;
  private logger: Logger;
  private pairedClients: Set<string> = new Set();
  private pendingPairings: Map<string, PairingRequest> = new Map();
  private pairToken: string | null = null;
  private clientId: string;
  private configSupplier: (() => any) | null = null;

  constructor() {
    this.clientId = this.generateClientId();
    this.logger = logger;
  }

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  initialize(socketUrl: string = 'ws://localhost:8080') {
    try {
      this.socket = new BasicSocket();
      this.socket.connect();

      this.logger.logInfo('socket', 'Socket service initialized', { clientId: this.clientId });

      this.socket.onMessage('pair_token', ({ token }) => {
        this.pairToken = token;
        this.logger.logInfo('socket', 'Received pairing token', { token });
      });

      this.socket.onMessage('pair_result', ({ success }) => {
        if (success) {
          this.pairedClients.add(this.clientId);
          this.logger.logInfo('socket', 'Pairing successful');
          this.syncConfig();
        } else {
          this.logger.logError('socket', 'Pairing denied');
        }
      });

      // Send pairing request on connection
      this.requestPairing();
      
      return true;
    } catch (error) {
      this.logger.logError('socket', 'Failed to initialize socket service', { error });
      return false;
    }
  }

  private requestPairing(): void {
    if (!this.socket?.isConnected) {
      this.logger.logError('socket', 'Cannot request pairing - socket not connected');
      return;
    }
    this.socket.sendMessage('pair_request', { clientId: this.clientId });
    this.logger.logInfo('socket', 'Pairing request sent', { clientId: this.clientId });
  }

  setConfigSupplier(fn: () => any) {
    this.configSupplier = fn;
  }

  private syncConfig(): void {
    if (!this.socket?.isConnected || !this.pairedClients.has(this.clientId)) return;
    const cfg = this.configSupplier ? this.configSupplier() : null;
    if (cfg) {
      this.socket.sendMessage('syncConfig', cfg);
      this.logger.logInfo('socket', 'Configuration synced');
    }
  }

  async request<T>(event: string, payload: any): Promise<T> {
    if (!this.socket?.isConnected) {
      this.logger.logError('socket', `Cannot send ${event} - socket not connected`);
      throw new Error('socket disconnected');
    }
    this.socket.sendMessage(event, { ...payload, clientId: this.clientId });
    // In this demo environment we don't have a real server, so just simulate
    // an asynchronous response
    return new Promise(resolve => setTimeout(() => resolve(undefined as unknown as T), 10));
  }

  // Server Actions
  async executeServerAction(action: ServerAction): Promise<boolean> {
    if (!this.socket?.isConnected) {
      this.logger.logError('socket', 'Cannot execute action - socket not connected', { action: action.type });
      return false;
    }

    if (!this.pairedClients.has(this.clientId)) {
      this.logger.logError('socket', 'Cannot execute action - client not paired', { action: action.type });
      return false;
    }

    try {
      const message: SocketMessage = {
        type: 'server_action',
        data: action,
        timestamp: new Date(),
        clientId: this.clientId
      };

      const success = this.socket.sendMessage('server_action', message);
      
      if (success) {
        this.logger.logInfo('socket', `Server action executed: ${action.type}`, { 
          action: action.type,
          repository: action.repositoryId,
          apiKey: action.apiKeyId 
        });
      } else {
        this.logger.logError('socket', `Failed to execute server action: ${action.type}`, { action });
      }

      return success;
    } catch (error) {
      this.logger.logError('socket', 'Error executing server action', { action: action.type, error });
      return false;
    }
  }

  // Repository Actions
  async mergeRepository(repositoryId: string, apiKeyId: string, pullRequestId: number): Promise<boolean> {
    return this.executeServerAction({
      type: 'merge',
      payload: { pullRequestId },
      apiKeyId,
      repositoryId
    });
  }

  async closePullRequest(repositoryId: string, apiKeyId: string, pullRequestId: number): Promise<boolean> {
    return this.executeServerAction({
      type: 'close',
      payload: { pullRequestId },
      apiKeyId,
      repositoryId
    });
  }

  async approvePullRequest(repositoryId: string, apiKeyId: string, pullRequestId: number): Promise<boolean> {
    return this.executeServerAction({
      type: 'approve',
      payload: { pullRequestId },
      apiKeyId,
      repositoryId
    });
  }

  async commentOnPullRequest(repositoryId: string, apiKeyId: string, pullRequestId: number, comment: string): Promise<boolean> {
    return this.executeServerAction({
      type: 'comment',
      payload: { pullRequestId, comment },
      apiKeyId,
      repositoryId
    });
  }

  async checkRepositoryStatus(repositoryId: string, apiKeyId: string): Promise<boolean> {
    return this.executeServerAction({
      type: 'check-status',
      payload: {},
      apiKeyId,
      repositoryId
    });
  }

  // GitHub Requests
  async fetchRepositories(token: string, owner: string): Promise<any> {
    return this.request('fetchRepos', { token, owner });
  }

  async fetchPullRequests(token: string, owner: string, repo: string): Promise<any> {
    return this.request('fetchPullRequests', { token, owner, repo });
  }

  async mergePR(token: string, owner: string, repo: string, pullNumber: number): Promise<any> {
    return this.request('mergePR', { token, owner, repo, pullNumber });
  }

  async closePR(token: string, owner: string, repo: string, pullNumber: number): Promise<any> {
    return this.request('closePR', { token, owner, repo, pullNumber });
  }

  async deleteBranch(
    token: string,
    owner: string,
    repo: string,
    branch: string,
    protectedPatterns: string[] = []
  ): Promise<any> {
    return this.request('deleteBranch', { token, owner, repo, branch, protectedPatterns });
  }

  async fetchStrayBranches(token: string, owner: string, repo: string): Promise<any> {
    return this.request('fetchStrayBranches', { token, owner, repo });
  }

  async fetchRecentActivity(token: string, repositories: any[]): Promise<any> {
    return this.request('fetchRecentActivity', { token, repositories });
  }

  async checkPRMergeable(token: string, owner: string, repo: string, pullNumber: number): Promise<any> {
    return this.request('checkPRMergeable', { token, owner, repo, pullNumber });
  }

  async subscribeRepo(
    token: string,
    owner: string,
    repo: string,
    interval?: number,
    config: Record<string, any> = {}
  ): Promise<any> {
    return this.request('subscribeRepo', { token, owner, repo, interval, config });
  }

  async unsubscribeRepo(owner: string, repo: string): Promise<any> {
    return this.request('unsubscribeRepo', { owner, repo });
  }

  // Connection Management
  get isConnected(): boolean {
    return this.socket?.isConnected || false;
  }

  get latency(): number {
    return this.socket?.latency || 0;
  }

  get isPaired(): boolean {
    return this.pairedClients.has(this.clientId);
  }

  get pendingPairingRequests(): PairingRequest[] {
    return Array.from(this.pendingPairings.values());
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.logger.logInfo('socket', 'Socket disconnected');
    }
    this.pairedClients.clear();
    this.pendingPairings.clear();
  }

  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
      this.requestPairing();
    }
  }
}

export const socketService = SocketService.getInstance();
