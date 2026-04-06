const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MySQL connection pool
const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 3306,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize database table
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
    console.log('Tabela app_data pronta.');
  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err.message);
  }
}

initDB();

// GET /api/data — busca todos os registros
app.get('/api/data', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT `key`, value, updated_at FROM app_data');
    const data = {};
    for (const row of rows) {
      data[row.key] = row.value;
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar dados:', err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do banco.' });
  }
});

// POST /api/data — salva ou atualiza um registro
app.post('/api/data', async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Campo "key" é obrigatório.' });
  }
  try {
    await pool.execute(
      'INSERT INTO app_data (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP',
      [key, value !== undefined ? value : null]
    );
    res.json({ success: true, key, value });
  } catch (err) {
    console.error('Erro ao salvar dados:', err.message);
    res.status(500).json({ error: 'Erro ao salvar dados no banco.' });
  }
});

// DELETE /api/data — remove um registro pela key
app.delete('/api/data', async (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Campo "key" é obrigatório.' });
  }
  try {
    const [result] = await pool.execute('DELETE FROM app_data WHERE `key` = ?', [key]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chave não encontrada.' });
    }
    res.json({ success: true, key });
  } catch (err) {
    console.error('Erro ao deletar dados:', err.message);
    res.status(500).json({ error: 'Erro ao deletar dados do banco.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

