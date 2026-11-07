import { isIP } from 'node:net';

export function checkLocalRequest(request: Request, mutation = false) {
  const host = request.headers.get('host') || '';
  const loopback = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  const address = host.replace(/:\d+$/, '');
  const octets = address.split('.').map(Number);
  const privateAddress = isIP(address) === 4 && (octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168));
  if (!loopback && !(process.env.DEVLIBRARY_ALLOW_NETWORK === 'true' && privateAddress)) throw new Error('Доступ разрешён только с этого компьютера');
  const origin = request.headers.get('origin');
  if ((mutation && !origin) || (origin && origin !== `http://${host}` && origin !== `https://${host}`)) throw new Error('Запрос должен быть отправлен из локальной библиотеки');
  if (mutation && !request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Ожидается JSON');
}
export async function localJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Пустой запрос');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 3_000_000) { await reader.cancel(); throw new Error('Запрос превышает 3 МБ'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
