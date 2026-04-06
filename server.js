const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MySQL connection pool using Railway environment variables
const pool = mysql.createPool(
  process.env.MYSQL_URL || {
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
  }
);

// Create table if it doesn't exist
async function initDB() {
  try {
    const conn = await pool.getConnection();
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS app_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    conn.release();
    console.log('Database table ready.');
  } catch (err) {
    console.error('Database init error:', err.message);
  }
}

initDB();

// POST /api/data — save or update a key/value pair
app.post('/api/data', async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'key is required' });
  }
  try {
    await pool.execute(
      'INSERT INTO app_data (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [key, value !== undefined ? String(value) : null]
    );
    res.json({ ok: true, key, value });
  } catch (err) {
    console.error('POST /api/data error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/data — retrieve all key/value pairs (or a single key via ?key=...)
app.get('/api/data', async (req, res) => {
  const { key } = req.query;
  try {
    if (key) {
      const [rows] = await pool.execute(
        'SELECT `key`, value FROM app_data WHERE `key` = ?',
        [key]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Key not found' });
      }
      return res.json(rows[0]);
    }
    const [rows] = await pool.execute('SELECT `key`, value FROM app_data');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/data error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/data — remove a key/value pair
app.delete('/api/data', async (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'key is required' });
  }
  try {
    await pool.execute('DELETE FROM app_data WHERE `key` = ?', [key]);
    res.json({ ok: true, key });
  } catch (err) {
    console.error('DELETE /api/data error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
