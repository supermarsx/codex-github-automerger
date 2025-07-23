export type MessageCallback = (data: unknown) => void;

export class BasicSocket {
  private listeners: Map<string, Set<MessageCallback>> = new Map();
  private connectListeners: Set<() => void> = new Set();
  private disconnectListeners: Set<() => void> = new Set();
  isConnected = false;
  latency = 0;

  connect(): void {
    this.isConnected = true;
    // simulate latency update
    this.latency = Math.floor(Math.random() * 100) + 20;
    this.connectListeners.forEach(cb => cb());
  }

  disconnect(): void {
    this.isConnected = false;
    this.disconnectListeners.forEach(cb => cb());
  }

  sendMessage(type: string, data: unknown): boolean {
    if (!this.isConnected) return false;
    if (type === 'ping') {
      const delay = Math.floor(Math.random() * 50) + 10;
      setTimeout(() => {
        this.latency = Date.now() - (data as any).timestamp;
        this.emitMessage('pong', data);
      }, delay);
      return true;
    }
    setTimeout(() => this.emitMessage(type, data), 0);
    return true;
  }

  sendRequest(type: string, data: unknown, cb: MessageCallback): boolean {
    if (!this.isConnected) return false;
    setTimeout(() => {
      this.emitMessage(type, data);
      cb(undefined);
    }, 10);
    return true;
  }

  onMessage(type: string, cb: MessageCallback): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(cb);
    return () => set!.delete(cb);
  }

  onConnect(cb: () => void): () => void {
    this.connectListeners.add(cb);
    return () => this.connectListeners.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }

  emitMessage(type: string, data: unknown): void {
    const set = this.listeners.get(type);
    if (set) {
      for (const cb of Array.from(set)) cb(data);
    }
  }
}
