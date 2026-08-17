import https from 'node:https';

function headersToObject(headers) {
  const out = {};
  if (!headers) return out;
  const h = new Headers(headers);
  h.forEach((value, key) => { out[key] = value; });
  return out;
}

async function bodyFromInput(input, init) {
  if (init?.body != null) return init.body;
  if (typeof Request !== 'undefined' && input instanceof Request) {
    if (input.method === 'GET' || input.method === 'HEAD') return undefined;
    try { return await input.clone().arrayBuffer(); } catch { return undefined; }
  }
  return undefined;
}

export async function ipv4Fetch(input, init = {}) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url);
  const method = init.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET');
  const baseHeaders = typeof Request !== 'undefined' && input instanceof Request ? headersToObject(input.headers) : {};
  const initHeaders = headersToObject(init.headers);
  const headers = { ...baseHeaders, ...initHeaders };
  let body = await bodyFromInput(input, init);

  if (body instanceof ArrayBuffer) body = Buffer.from(body);
  else if (ArrayBuffer.isView(body)) body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);

  return new Promise((resolve, reject) => {
    const req = https.request({
      protocol: 'https:',
      hostname: url.hostname,
      port: url.port || 443,
      path: `${url.pathname}${url.search}`,
      method,
      headers,
      family: 4,
      timeout: 15000,
      servername: url.hostname,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v));
          else if (value != null) responseHeaders.set(key, String(value));
        }
        resolve(new Response(Buffer.concat(chunks), {
          status: res.statusCode || 500,
          statusText: res.statusMessage || '',
          headers: responseHeaders,
        }));
      });
    });

    req.on('timeout', () => req.destroy(Object.assign(new Error('HTTPS request timed out'), { code: 'SAAMS_HTTPS_TIMEOUT' })));
    req.on('error', (error) => reject(error));

    if (body == null) req.end();
    else if (typeof body === 'string' || Buffer.isBuffer(body)) req.end(body);
    else req.end(String(body));
  });
}

export function supabaseClientOptions(extra = {}) {
  return {
    ...extra,
    global: {
      ...(extra.global || {}),
      fetch: ipv4Fetch,
      headers: { ...(extra.global?.headers || {}) },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      ...(extra.auth || {}),
    },
  };
}
