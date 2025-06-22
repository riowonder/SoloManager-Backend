const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://192.168.1.6:5173",
  "https://your-production-frontend.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Preflight handler for CORS
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const memberRoutes = require('./routes/memberRoutes');
app.use('/api/member', memberRoutes);

const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const financeRoutes = require('./routes/financeRoutes');
app.use('/api/finance', financeRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});

const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

