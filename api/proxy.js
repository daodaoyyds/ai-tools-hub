export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const targetUrl = req.headers['x-target-url'];
  const apiKey    = req.headers['x-api-key'];
  const method    = (req.headers['x-method'] || req.method).toUpperCase();
  const contentType = req.headers['content-type'] || 'application/json';
  const extraHeaders = req.headers['x-extra-headers'];

  if (!targetUrl) {
    return res.status(400).json({ error: '缺少 X-Target-Url 请求头' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    const headers = {
      'Content-Type': contentType,
      'Authorization': `Bearer ${apiKey}`,
    };

    if (extraHeaders) {
      try {
        const extra = JSON.parse(extraHeaders);
        Object.assign(headers, extra);
      } catch (_) {}
    }

    const options = { method, headers };
    if (method !== 'GET' && method !== 'HEAD' && rawBody.length) {
      options.body = rawBody;
    }

    const response = await fetch(targetUrl, options);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
