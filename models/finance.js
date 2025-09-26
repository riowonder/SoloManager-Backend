import mongoose from 'mongoose';

const financeSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income'], required: true, default: 'income' },
  amount: { type: Number, required: true },
  description: { type: String },
  plan: { type: String },
  date: { type: Date, default: Date.now },
  category: { type: String },
}, { timestamps: true });

const Finance = mongoose.model('Finance', financeSchema);
export default Finance;
