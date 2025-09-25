import { createServer } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import '../jobs/subscriptionCron.js';
import authRoutes from '../routes/authRoutes.js';
import memberRoutes from '../routes/memberRoutes.js';
import dashboardRoutes from '../routes/dashboardRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';
import financeRoutes from '../routes/financeRoutes.js';
import test from '../routes/test.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
const corsOptions = {
  origin: [
    "https://solo-manager-frontend.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"]
};
app.use(cors(corsOptions));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/test', test);

app.get('/', (req, res) => {
  res.send('API is running');
});

// Connect DB before handling requests
let isConnected = false;
const ensureDBConnected = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

// Export Vercel handler
export default async function handler(req, res) {
  await ensureDBConnected();
  const server = createServer(app);
  server(req, res);
}
