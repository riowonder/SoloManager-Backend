const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Expired', 'Upcoming'], default: 'Active' },
  amount: { type: Number },
  extra_days: { type: Number, default: 0 },
  start_date: { type: Date },
  end_date: { type: Date },
  days_left: { type: Number, default: 0 },
  gym_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },

  reminderSent: { type: Boolean, default: false },
  messageSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
