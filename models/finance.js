const mongoose = require('mongoose');

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

module.exports = mongoose.model('Finance', financeSchema);
