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

  if (!targetUrl) {
    return res.status(400).json({ error: '缺少 X-Target-Url 请求头' });
  }

  try {
    const extraHeaders = req.headers['x-extra-headers']
      ? JSON.parse(req.headers['x-extra-headers'])
      : {};

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...extraHeaders,
      },
    };

    if (method !== 'GET' && method !== 'HEAD' && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
