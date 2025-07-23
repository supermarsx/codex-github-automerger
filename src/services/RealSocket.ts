import { io, Socket } from 'socket.io-client';
import type { MessageCallback } from './BasicSocket';

export class RealSocket {
  private socket: Socket;
  private connectListeners: Set<() => void> = new Set();
  private disconnectListeners: Set<() => void> = new Set();
  isConnected = false;
  latency = 0;

  constructor(private url: string) {
    this.socket = io(this.url, { autoConnect: false });
  }

  connect(): void {
    this.socket.connect();
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.connectListeners.forEach(cb => cb());
    });
    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.disconnectListeners.forEach(cb => cb());
    });
  }

  disconnect(): void {
    this.socket.disconnect();
    this.isConnected = false;
    this.disconnectListeners.forEach(cb => cb());
  }

  sendMessage(type: string, data: unknown): boolean {
    if (!this.socket.connected) return false;
    this.socket.emit(type, data);
    return true;
  }

  sendRequest(type: string, data: unknown, cb: MessageCallback): boolean {
    if (!this.socket.connected) return false;
    this.socket.emit(type, data, cb);
    return true;
  }

  onMessage(type: string, cb: MessageCallback): () => void {
    this.socket.on(type, cb);
    return () => {
      this.socket.off(type, cb);
    };
  }

  onConnect(cb: () => void): () => void {
    this.connectListeners.add(cb);
    return () => this.connectListeners.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }
}
