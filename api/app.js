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

// -------------------- Middleware --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// -------------------- CORS --------------------
const corsOptions = {
  origin: [
    "https://solo-manager-frontend.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET","POST","PUT","DELETE","PATCH","HEAD"],
  credentials: true,
  allowedHeaders: ["Content-Type","Authorization","Access-Control-Allow-Credentials"]
};
app.use(cors(corsOptions));

// -------------------- Routes --------------------
app.use('/auth', authRoutes);
app.use('/member', memberRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/finance', financeRoutes);
app.use('/test', test);

app.get('/api/app', (req, res) => {
  res.send('API is running');
});

// -------------------- DB Connection --------------------
let isConnected = false;
const ensureDBConnected = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

// -------------------- Vercel Handler --------------------
export default async function handler(req, res) {
  await ensureDBConnected();
  console.log("🔵 Request received (Vercel handler)");
  app(req, res); // use Express as a handler
}

// -------------------- Local Development --------------------
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  ensureDBConnected().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Local server running at http://localhost:${PORT}`);
    });
  });
}
