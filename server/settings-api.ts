import type { IncomingMessage, ServerResponse } from 'node:http';
import { ZodError } from 'zod';
import type { SettingsRepository } from './settings-repository';

const MAX_BODY_BYTES = 64 * 1024;
function json(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(data));
}

export function isLocalRequest(request: IncomingMessage, port: number): boolean {
  return [`127.0.0.1:${port}`, `localhost:${port}`].includes(request.headers.host ?? '');
}

export async function handleSettingsApi(
  request: IncomingMessage,
  response: ServerResponse,
  repository: SettingsRepository,
): Promise<void> {
  if (request.method === 'GET') {
    try {
      json(response, 200, repository.read());
    } catch {
      json(response, 500, {
        error: 'Saved defaults could not be read. The database has not been changed.',
      });
    }
    return;
  }
  if (request.method !== 'PUT') {
    response.setHeader('Allow', 'GET, PUT');
    json(response, 405, { error: 'Method not allowed' });
    return;
  }
  if (
    request.headers.origin !== `http://${request.headers.host}` ||
    request.headers['sec-fetch-site'] === 'cross-site'
  ) {
    json(response, 403, { error: 'Settings may only be changed from the local application.' });
    return;
  }
  if (request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') {
    json(response, 415, { error: 'Expected application/json' });
    return;
  }
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.byteLength;
      if (size > MAX_BODY_BYTES) {
        json(response, 413, { error: 'Defaults are too large' });
        return;
      }
      chunks.push(buffer);
    }
    json(response, 200, repository.save(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
  } catch (error) {
    const invalid = error instanceof SyntaxError || error instanceof ZodError;
    json(response, invalid ? 400 : 500, {
      error: invalid ? 'Invalid defaults. Nothing was saved.' : 'Could not save defaults.',
    });
  }
}
