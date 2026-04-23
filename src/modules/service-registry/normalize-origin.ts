export function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const port = shouldKeepPort(protocol, url.port) ? `:${url.port}` : '';

    return `${protocol}//${hostname}${port}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

function shouldKeepPort(protocol: string, port: string): boolean {
  if (!port) return false;
  if (protocol === 'http:' && port === '80') return false;
  if (protocol === 'https:' && port === '443') return false;
  return true;
}
