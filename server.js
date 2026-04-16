const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory store (substitua por MySQL conforme necessário)
const store = {};

// GET /api/data — retorna todos os dados ou um específico via ?key=
app.get('/api/data', (req, res) => {
  const { key } = req.query;
  if (key) {
    if (Object.prototype.hasOwnProperty.call(store, key)) {
      return res.json({ key, value: store[key] });
    }
    return res.status(404).json({ error: 'Chave não encontrada' });
  }
  return res.json(store);
});

// POST /api/data — salva ou atualiza { key, value }
app.post('/api/data', (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Campo "key" é obrigatório' });
  }
  store[key] = value;
  return res.json({ key, value });
});

// DELETE /api/data — remove { key }
app.delete('/api/data', (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Campo "key" é obrigatório' });
  }
  if (Object.prototype.hasOwnProperty.call(store, key)) {
    delete store[key];
    return res.json({ deleted: key });
  }
  return res.status(404).json({ error: 'Chave não encontrada' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
