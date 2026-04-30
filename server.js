const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

res.sendFile(path.join(__dirname, 'public', 'index.html'));
res.sendFile(path.join(__dirname, 'index.html'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎟  СИСТЕМА КВИТКІВ запущена`);
  console.log(`👉  Відкрийте: http://localhost:${PORT}\n`);
});
