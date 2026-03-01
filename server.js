require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const paymentRoutes = require('./routes/payment');
const scholarshipsRoutes = require('./routes/scholarship');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from the `ew` folder (new frontend)
app.use(express.static(path.join(__dirname, 'ew')));

// Serve root to homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ew', 'homepage.html'));
});

// Mount API routes: payments and scholarships (auth/login removed)
app.use('/api', paymentRoutes);
app.use('/api', scholarshipsRoutes);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('mongodb+srv://ScholarshipDb:VBUhCnsZJb8HfjzL@scholaship.hw6elfl.mongodb.net/?appName=Scholaship');

    // If MONGODB_DB is set use it, otherwise default to 'User-registration'
    const dbName = process.env.MONGODB_DB || 'User-registration';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true, dbName });
    console.log('Connected to MongoDB');

    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop the process using the port or set PORT in .env to a different value.`);
        process.exit(1);
      }
      console.error('Server error:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();