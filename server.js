require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client } = require('@notionhq/client');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

console.log('Server starting up...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Notion API Client
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

if (!process.env.NOTION_API_KEY) {
  console.warn('WARNING: NOTION_API_KEY is not set. Notion API calls will fail.');
}
if (!databaseId) {
  console.warn('WARNING: NOTION_DATABASE_ID is not set. Notion API calls will fail.');
}

// CORS設定
// TODO: 本番環境ではオリジンを制限する
app.use(cors());
console.log('CORS middleware enabled.');

// JSONボディパーサー
app.use(express.json());
console.log('JSON body parser middleware enabled.');

// Rate Limiter: 1分間に60リクエストまで
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per `window` (here, per 1 minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on path: ${req.path}`);
    res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });
  }
});
app.use('/api/', apiLimiter);
console.log('API rate limiter enabled for /api/ routes.');

// --- API Endpoints ---

// POST /api/score: スコアを記録
app.post('/api/score', async (req, res) => {
  console.log(`[POST /api/score] Request received from IP: ${req.ip}`);
  const { player, score, timestamp } = req.body;
  console.log(`[POST /api/score] Request body: player=${player}, score=${score}, timestamp=${timestamp}`);

  // バリデーション
  if (!player || typeof player !== 'string' || player.length < 1 || player.length > 20) {
    console.warn(`[POST /api/score] Validation failed: Invalid player name '${player}'`);
    return res.status(400).json({ success: false, message: 'Player name must be 1-20 characters long.' });
  }
  if (typeof score !== 'number') { 
    console.warn(`[POST /api/score] Validation failed: Invalid score type '${score}'`);
    return res.status(400).json({ success: false, message: 'Score must be a number.' });
  }
  if (!timestamp || typeof timestamp !== 'string') {
    console.warn(`[POST /api/score] Validation failed: Missing or invalid timestamp '${timestamp}'`);
    return res.status(400).json({ success: false, message: 'Timestamp is required.' });
  }

  try {
    console.log(`[POST /api/score] Attempting to create Notion page for player: ${player}`);
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Player: { title: [{ text: { content: player } }] },
        Score: { number: score },
        Date: { date: { start: timestamp } },
      },
    });
    console.log(`[POST /api/score] Score recorded successfully for ${player}. Notion page ID: ${response.id}`);
    res.status(201).json({ success: true, pageId: response.id });
  } catch (error) {
    console.error(`[POST /api/score] Error recording score for ${player}:`, error.body || error.message || error);
    res.status(500).json({ success: false, message: 'Failed to record score.' });
  }
});

// GET /api/ranking: ランキングを取得
app.get('/api/ranking', async (req, res) => {
  console.log(`[GET /api/ranking] Request received from IP: ${req.ip}`);
  const limit = parseInt(req.query.limit) || 10;
  console.log(`[GET /api/ranking] Fetching ranking with limit: ${limit}`);

  try {
    console.log(`[GET /api/ranking] Attempting to query Notion database ID: ${databaseId}`);
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        { property: 'Score', direction: 'descending' },
        { property: 'Date', direction: 'ascending' }, // 同点の場合は日時が古い方が上位
      ],
      page_size: limit,
    });

    console.log(`[GET /api/ranking] Notion query successful. Number of results: ${response.results.length}`);
    console.log(`[GET /api/ranking] First result properties for debugging:`, JSON.stringify(response.results[0]?.properties, null, 2));

    const results = response.results.map((page) => ({
      player: page.properties.Player.title[0]?.plain_text || 'Unknown',
      score: page.properties.Score.number,
      date: page.properties.Date.date?.start, // Notionのプロパティ名に合わせて 'Date' に変更
    }));
    console.log(`[GET /api/ranking] Processed ranking results:`, results);

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error(`[GET /api/ranking] Error fetching ranking:`, error.body || error.message || error);
    res.status(500).json({ success: false, message: 'Failed to fetch ranking.' });
  }
});

// フロントエンドの静的ファイルを配信 (開発中はVite dev serverが担当)
// 本番環境ではこの設定が必要になる
// app.use(express.static('application/dist'));
// app.get('*', (req, res) => {
//   res.sendFile(path.resolve(__dirname, 'application', 'dist', 'index.html'));
// });

// サーバー起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Notion Database ID: ${databaseId}`);
  console.log('Server initialization complete.');
});
