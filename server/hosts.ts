import type { IncomingMessage } from 'node:http';

/** Host headers the server answers: loopback on its port, plus any explicitly configured. */
export function allowedHosts(port: number, extra = ''): Set<string> {
  return new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    ...extra
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  ]);
}

export function isAllowedHost(request: IncomingMessage, hosts: Set<string>): boolean {
  return hosts.has((request.headers.host ?? '').toLowerCase());
}