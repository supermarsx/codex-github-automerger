import { BasicSocket } from './BasicSocket';
import { RealSocket } from './RealSocket';
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
  private socket: BasicSocket | RealSocket | null = null;
  private logger: Logger;
  private pairedClients: Set<string> = new Set();
  private pendingPairings: Map<string, PairingRequest> = new Map();
  private pairToken: string | null = null;
  private clientId: string;
  private configSupplier: (() => any) | null = null;
  private address = 'localhost';
  private port = 8080;
  private maxRetries = 5;
  private connectionAttempts = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPing = 0;
  private connectListeners: Set<() => void> = new Set();
  private disconnectListeners: Set<() => void> = new Set();
  private pairTokenListeners: Set<(token: string) => void> = new Set();
  private pairResultListeners: Set<(success: boolean) => void> = new Set();
  private pingListeners: Set<(latency: number) => void> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private autoReconnect: boolean;

  constructor(autoReconnect = true) {
    this.clientId = this.generateClientId();
    this.logger = logger;
    this.autoReconnect = autoReconnect;
  }

  private handleSocketConnect = () => {
    this.logger.logDebug('socket', 'Connected to server');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectDelay = 1000;
    this.connectListeners.forEach(cb => cb());
  };

  private handleSocketDisconnect = () => {
    this.logger.logDebug('socket', 'Disconnected from server');
    this.disconnectListeners.forEach(cb => cb());
    if (!this.autoReconnect) return;
    this.scheduleReconnect();
  };

  private registerSocketEventHandlers() {
    if (!this.socket) return;
    if ('onConnect' in this.socket) {
      (this.socket as any).onConnect(this.handleSocketConnect);
    }
    if ('onDisconnect' in this.socket) {
      (this.socket as any).onDisconnect(this.handleSocketDisconnect);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.logger.logDebug('socket', 'Scheduling reconnect', { delay: this.reconnectDelay });
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      const success = await this.reconnect();
      if (!success && this.autoReconnect) {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        this.scheduleReconnect();
      }
    }, this.reconnectDelay);
  }

  static getInstance(autoReconnect = true): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService(autoReconnect);
    }
    return SocketService.instance;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize(address?: string, port?: number, maxRetries?: number): Promise<boolean> {
    const cfg = this.configSupplier ? this.configSupplier() : null;
    this.address = address ?? cfg?.socketServerAddress ?? 'localhost';
    this.port = port ?? cfg?.socketServerPort ?? 8080;
    this.maxRetries = maxRetries ?? cfg?.socketMaxRetries ?? 5;
    const socketUrl = `http://${this.address}:${this.port}`;
    const CONNECT_TIMEOUT_MS = 500;
    this.connectionAttempts = 0;

    while (this.connectionAttempts <= this.maxRetries) {
      try {
        this.logger.logDebug('socket', 'attempting connection', {
          attempt: this.connectionAttempts + 1,
          url: socketUrl
        });
        const useReal = (import.meta as any).env?.VITE_USE_REAL_SOCKET === 'true';
        this.socket = useReal ? new RealSocket(socketUrl) : new BasicSocket();
        this.registerSocketEventHandlers();

        const connected = await new Promise<boolean>(resolve => {
          let off: () => void = () => {};
          const timeout = setTimeout(() => {
            off();
            resolve(false);
          }, CONNECT_TIMEOUT_MS);
          off = (this.socket as any).onConnect(() => {
            clearTimeout(timeout);
            off();
            resolve(true);
          });
          this.socket!.connect();
        });

        if (!connected) throw new Error('connection failed');

        this.logger.logInfo('socket', 'Socket service initialized', {
          clientId: this.clientId,
          url: socketUrl
        });

        this.socket.onMessage('pair_token', ({ token }) => {
          this.pairToken = token;
          this.logger.logInfo('socket', 'Received pairing token', { token });
          this.pairTokenListeners.forEach(cb => cb(token));
        });

        this.socket.onMessage('pair_result', ({ success }) => {
          if (success) {
            this.pairedClients.add(this.clientId);
            this.logger.logInfo('socket', 'Pairing successful');
            this.syncConfig();
          }
          this.pairResultListeners.forEach(cb => cb(success));
          if (!success) {
            this.logger.logError('socket', 'Pairing denied');
          }
        });

        this.socket.onMessage('pong', payload => {
          const ts = (payload as any)?.timestamp;
          const now = Date.now();
          if (typeof ts === 'number') {
            this.socket!.latency = now - ts;
          } else if (this.lastPing) {
            this.socket!.latency = now - this.lastPing;
          }
          this.pingListeners.forEach(cb => cb(this.socket!.latency));
        });

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.socket?.isConnected) {
            this.lastPing = Date.now();
            this.socket.sendMessage('ping', { timestamp: this.lastPing });
          }
        }, 5000);

        this.lastPing = Date.now();
        this.socket.sendMessage('ping', { timestamp: this.lastPing });

        // Send pairing request on connection
        this.requestPairing();

        return true;
      } catch (error) {
        this.socket?.disconnect();
        this.connectionAttempts += 1;
        this.logger.logError('socket', 'Connection attempt failed', {
          attempt: this.connectionAttempts,
          error
        });
      }
    }

    this.socket = null;
    this.logger.logError('socket', 'Failed to initialize socket service', {
      retries: this.maxRetries
    });
    return false;
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

  syncConfigWithServer() {
    this.syncConfig();
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
    return new Promise(resolve => {
      if ('sendRequest' in this.socket!) {
        (this.socket as any).sendRequest(event, { ...payload, clientId: this.clientId }, (res: T) => resolve(res));
      } else {
        this.socket!.sendMessage(event, { ...payload, clientId: this.clientId });
        setTimeout(() => resolve(undefined as unknown as T), 10);
      }
    });
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
  async fetchRepositories(
    token: string,
    owner: string,
    visibility = 'all',
    affiliation = 'owner,collaborator,organization_member'
  ): Promise<any> {
    return this.request('fetchRepos', { token, owner, visibility, affiliation });
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
    protectedPatterns: string[] = [],
    allowedPatterns: string[] = []
  ): Promise<any> {
    return this.request('deleteBranch', {
      token,
      owner,
      repo,
      branch,
      protectedPatterns,
      allowedPatterns
    });
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

  onConnect(cb: () => void): () => void {
    this.connectListeners.add(cb);
    return () => this.connectListeners.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }

  onPairToken(cb: (token: string) => void): () => void {
    this.pairTokenListeners.add(cb);
    return () => this.pairTokenListeners.delete(cb);
  }

  onPairResult(cb: (success: boolean) => void): () => void {
    this.pairResultListeners.add(cb);
    return () => this.pairResultListeners.delete(cb);
  }

  onPing(cb: (latency: number) => void): () => void {
    this.pingListeners.add(cb);
    return () => this.pingListeners.delete(cb);
  }

  on(event: string, cb: (data: any) => void): () => void {
    if (!this.socket) return () => {};
    return (this.socket as any).onMessage(event, cb);
  }

  get currentPairToken(): string | null {
    return this.pairToken;
  }

  get isPaired(): boolean {
    return this.pairedClients.has(this.clientId);
  }

  get pendingPairingRequests(): PairingRequest[] {
    return Array.from(this.pendingPairings.values());
  }

  disconnect(): void {
    if (this.socket) {
      this.logger.logDebug('socket', 'disconnect called');
      this.socket.disconnect();
      this.logger.logInfo('socket', 'Socket disconnected');
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectDelay = 1000;
    this.pairedClients.clear();
    this.pendingPairings.clear();
  }

  reconnect(): Promise<boolean> {
    this.logger.logDebug('socket', 'reconnect called');
    return this.initialize(this.address, this.port, this.maxRetries);
  }
}

let instance: SocketService | null = null;

export function getSocketService(autoReconnect = true): SocketService {
  if (!instance) {
    instance = SocketService.getInstance(autoReconnect);
  }
  return instance;
}
