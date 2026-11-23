import type { IncomingMessage, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parseCookies, SESSION_COOKIE_NAME, verifySessionToken } from './security.ts';
import type { StaffRole } from '../src/types/hotel';

interface ConnectedClient {
  ws: WebSocket;
  isStaff: boolean;
  role: StaffRole | 'guest';
  userId?: string;
}

const clients = new Set<ConnectedClient>();
let wss: WebSocketServer | null = null;

export type RealtimeChannelScope = 'public' | 'staff' | 'guest_self';

export interface RealtimeEventEnvelope {
  type: string;
  scope: RealtimeChannelScope;
  payload: unknown;
  timestamp: string;
}

export function attachWebSocketServer(httpServer: HttpServer): WebSocketServer {
  if (wss) return wss;

  wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (reqUrl.pathname !== '/ws') {
      return; // Let other handlers (if any) handle or destroy unknown paths
    }

    const cookies = parseCookies(req.headers.cookie);
    const queryToken = reqUrl.searchParams.get('token') || '';
    const token = cookies[SESSION_COOKIE_NAME] || queryToken;
    const verified = token ? verifySessionToken(token) : null;

    wss!.handleUpgrade(req, socket, head, (ws) => {
      const client: ConnectedClient = {
        ws,
        isStaff: Boolean(verified),
        role: verified ? verified.role : 'guest',
        userId: verified?.sub,
      };
      clients.add(client);

      ws.send(
        JSON.stringify({
          type: 'connected',
          scope: client.isStaff ? 'staff' : 'public',
          payload: { role: client.role, serverTime: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        })
      );

      ws.on('close', () => {
        clients.delete(client);
      });
      ws.on('error', () => {
        clients.delete(client);
      });
    });
  });

  return wss;
}

export function broadcastRealtimeEvent(
  type: string,
  payload: unknown,
  scope: RealtimeChannelScope = 'staff'
): void {
  const frame = JSON.stringify({
    type,
    scope,
    payload,
    timestamp: new Date().toISOString(),
  } satisfies RealtimeEventEnvelope);

  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;
    if (scope === 'staff' && !client.isStaff) continue;
    try {
      client.ws.send(frame);
    } catch {
      // Ignore closed socket errors
    }
  }
}

export function getActiveWebSocketCount(): number {
  let count = 0;
  for (const c of clients) {
    if (c.ws.readyState === WebSocket.OPEN) count++;
  }
  return count;
}
