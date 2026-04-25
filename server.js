/**
 * server.js — Express сервер для системи продажу квитків
 * Запуск: node server.js  →  http://localhost:3000
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Статичні файли з папки public
// Було:
app.use(express.static(path.join(__dirname, 'public')));
// Стало (просто поточна папка):
app.use(express.static(__dirname));

// Було:
res.sendFile(path.join(__dirname, 'public', 'index.html'));
// Стало:
res.sendFile(path.join(__dirname, 'index.html'));

// Головна сторінка
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎟  СИСТЕМА КВИТКІВ запущена`);
  console.log(`👉  Відкрийте: http://localhost:${PORT}\n`);
});
