import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'gestion-del-fin-api is alive!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});