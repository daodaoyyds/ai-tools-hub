import { put } from '@vercel/blob';

export const config = {
  api: { bodyParser: false },
};

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;        // 10MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;       // 200MB

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const contentType = req.headers['content-type'] || '';
    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ error: `不支持的文件类型：${contentType}。仅支持 JPEG/PNG/WEBP 或 MP4/MOV/AVI/WEBM/MKV/FLV/WMV` });
    }
    const isVideo = VIDEO_TYPES.includes(contentType);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > maxSize) {
        return res.status(413).json({ error: `文件超过 ${maxSize/1024/1024}MB 上限` });
      }
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);

    const extMap = { 'video/quicktime':'mov', 'video/x-msvideo':'avi', 'video/x-matroska':'mkv', 'video/x-flv':'flv', 'video/x-ms-wmv':'wmv' };
    const ext = extMap[contentType] || contentType.split('/')[1].replace('jpeg', 'jpg');
    const prefix = isVideo ? 'vid' : 'ref';
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const blob = await put(filename, buf, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });

    return res.status(200).json({ url: blob.url, size: total });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
