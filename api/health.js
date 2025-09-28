export default async function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MusicRx Backend API',
    endpoints: [
      'POST /api/convert-video',
      'POST /api/download-media',
      'GET /api/health'
    ]
  });
}
