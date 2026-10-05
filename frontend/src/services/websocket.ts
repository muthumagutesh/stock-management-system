type EventCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectInterval = 3000;
  private isConnecting = false;
  private isManualDisconnect = false;

  public connect(url = 'ws://localhost:8000/ws/stock/') {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.isConnecting = true;
    this.isManualDisconnect = false;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('[WebSocket] Real-time stream connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event || payload.type;
          const data = payload.data || payload;

          if (eventType && this.listeners.has(eventType)) {
            this.listeners.get(eventType)?.forEach((cb) => cb(data));
          }
          // Global wild-card listeners
          if (this.listeners.has('*')) {
            this.listeners.get('*')?.forEach((cb) => cb({ event: eventType, data }));
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing event message', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        if (!this.isManualDisconnect) {
          setTimeout(() => this.connect(url), this.reconnectInterval);
        }
      };

      this.ws.onerror = (err) => {
        // Will trigger onclose and attempt reconnect
        this.ws?.close();
      };
    } catch (e) {
      this.isConnecting = false;
      setTimeout(() => this.connect(url), this.reconnectInterval);
    }
  }

  public subscribe(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);

    // Return un-subscriber
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public disconnect() {
    this.isManualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();
