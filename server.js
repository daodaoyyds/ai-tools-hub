/**
 * 本地 CORS 代理 - 用于火山引擎等不支持浏览器直接调用的 API
 *
 * 使用方法：
 *   1. 确保电脑已安装 Node.js (https://nodejs.org)
 *   2. 在此文件所在目录打开终端，运行：node server.js
 *   3. 看到 "代理已启动" 后，回到网页点击生成即可
 *
 * 无需安装任何额外依赖，只使用 Node.js 内置模块。
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 7788;

const server = http.createServer((req, res) => {
  // CORS headers - allow browser to call
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: '代理运行中', port: PORT }));
    return;
  }

  if (req.url !== '/proxy') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Read request body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const targetUrl = req.headers['x-target-url'];
    const apiKey = req.headers['x-api-key'];
    const method = (req.headers['x-method'] || req.method).toUpperCase();

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少 X-Target-Url 请求头' }));
      return;
    }

    const parsed = url.parse(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    };

    if (method !== 'GET' && method !== 'HEAD' && body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const proxyReq = lib.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
      console.error('转发请求失败:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '代理请求失败: ' + e.message }));
    });

    if (method !== 'GET' && method !== 'HEAD' && body) {
      proxyReq.write(body);
    }
    proxyReq.end();

    console.log(`[${new Date().toLocaleTimeString()}] ${method} ${targetUrl}`);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✅ 代理已启动，监听端口', PORT);
  console.log('  📡 浏览器 → localhost:7788/proxy → 目标 API');
  console.log('');
  console.log('  现在可以回到网页，点击「生成」按钮了');
  console.log('  按 Ctrl+C 停止代理');
  console.log('');
});
