/**
 * @file src/api/ws.ts
 * @description Resilient, auto-reconnecting WebSocket client for the `/ws/live` stream.
 *
 * WHY THIS EXISTS:
 * Listens for live 100 Hz kinematic telemetry frames, real-time status updates,
 * attempt decisions, and push security notifications, with exponential backoff reconnection.
 */

type ListenerCallback = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<ListenerCallback>> = new Map();
  private reconnectTimeout: any = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 15000;
  private isConnected = false;
  private shouldReconnect = true;

  constructor() {
    const defaultWsUrl = window.location.protocol === 'https:'
      ? `wss://${window.location.hostname}:3000/ws/live`
      : `ws://${window.location.hostname}:3000/ws/live`;
    this.url = import.meta.env.VITE_WS_URL || defaultWsUrl;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectDelay = 1000;
        this.emit('connection_change', { online: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type) {
            this.emit(msg.type, msg);
            this.emit('*', msg);
          }
        } catch {
          // ignore malformed
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', { online: false });
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.emit('connection_change', { online: false });
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  public subscribe(eventType: string, callback: ListenerCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private emit(eventType: string, data: any): void {
    const cbs = this.listeners.get(eventType);
    if (cbs) {
      for (const cb of cbs) {
        try {
          cb(data);
        } catch (e) {
          console.error('Error in WS subscriber callback:', e);
        }
      }
    }
  }

  public send(msg: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public getOnlineStatus(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
