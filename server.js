require('dotenv').config();
const express = require('express');
const { Client } = require('@notionhq/client');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Notion API Client
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

// CORS設定
// TODO: 本番環境ではオリジンを制限する
app.use(cors());

// JSONボディパーサー
app.use(express.json());

// Rate Limiter: 1分間に60リクエストまで
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per `window` (here, per 1 minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', apiLimiter);

// --- API Endpoints ---

// POST /api/score: スコアを記録
app.post('/api/score', async (req, res) => {
  const { player, score, timestamp } = req.body;

  // バリデーション
  if (!player || typeof player !== 'string' || player.length < 1 || player.length > 20) {
    return res.status(400).json({ success: false, message: 'Player name must be 1-20 characters long.' });
  }
  if (typeof score !== 'number' || score < -1000000 || score > 1000000) { // スコアの範囲は適宜調整
    return res.status(400).json({ success: false, message: 'Score must be a number between -1,000,000 and 1,000,000.' });
  }
  if (!timestamp || typeof timestamp !== 'string') {
    return res.status(400).json({ success: false, message: 'Timestamp is required.' });
  }

  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Player: { title: [{ text: { content: player } }] },
        Score: { number: score },
        Date: { date: { start: timestamp } },
      },
    });
    console.log(`Score recorded for ${player}: ${score} at ${timestamp}`);
    res.status(201).json({ success: true, pageId: response.id });
  } catch (error) {
    console.error('Error recording score:', error.body || error);
    res.status(500).json({ success: false, message: 'Failed to record score.' });
  }
});

// GET /api/ranking: ランキングを取得
app.get('/api/ranking', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        { property: 'Score', direction: 'descending' },
        { property: 'Date', direction: 'ascending' }, // 同点の場合は日時が古い方が上位
      ],
      page_size: limit,
    });

    const results = response.results.map((page) => ({
      player: page.properties.Player.title[0]?.plain_text || 'Unknown',
      score: page.properties.Score.number,
      date: page.properties.Date.date?.start,
    }));

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Error fetching ranking:', error.body || error);
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
});
