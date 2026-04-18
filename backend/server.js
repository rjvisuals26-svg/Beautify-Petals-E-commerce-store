const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Database connection (XAMPP Default)
const db = mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'beautify petals_db'
});

db.connect((err) => {
  if (err) {
    console.error('⚠️ Error connecting to MySQL database:', err.message);
    return;
  }
  console.log('✅ Task 1 Backend: Connected to MySQL database.');
});

// --- TASK 1 ENDPOINTS (Beauty Shop) ---
app.get('/products', (req, res) => {
  const query = 'SELECT * FROM products';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/products/:id', (req, res) => {
  const query = 'SELECT * FROM products WHERE id = ?';
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    results.length ? res.json(results[0]) : res.status(404).json({ error: 'Product not found' });
  });
});

app.listen(port, () => {
  console.log(`🚀 Task 1 Server running on http://localhost:${port}`);
});
