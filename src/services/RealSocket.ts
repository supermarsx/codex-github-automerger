import { io, Socket } from 'socket.io-client';
import type { MessageCallback } from './BasicSocket';

export class RealSocket {
  private socket: Socket;
  isConnected = false;
  latency = 0;

  constructor(private url: string) {
    this.socket = io(this.url, { autoConnect: false });
  }

  connect(): void {
    this.socket.connect();
    this.socket.on('connect', () => {
      this.isConnected = true;
    });
    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  disconnect(): void {
    this.socket.disconnect();
    this.isConnected = false;
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
}
