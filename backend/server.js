require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware configuration
app.use(cors({
  origin: '*', // Allow all origins for testing/deployment flexibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Main route mappings
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/images', require('./routes/imageRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'healthy', time: new Date() });
});

// Standard 404 handler for unmatched routes
app.use((req, res, next) => {
  return res.status(404).json({ message: 'Resource path not found' });
});

// Robust global error catcher
app.use((err, req, res, next) => {
  console.error('Captured exception:', err.stack);
  return res.status(500).json({ message: 'Internal server error occurred.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Express API Gateway server active on port ${PORT}`);
});
