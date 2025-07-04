const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  roll_no: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone_number: {
    type: String,
    trim: true
  },
  height: {
    type: Number,
    trim: true
  },
  weight: {
    type: Number,
    trim: true
  },
  gender: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },  
  subscriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: []
  }],
  gym_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, { timestamps: true, strict: false });

// Compound unique index for roll_no within a gym
userSchema.index({ gym_id: 1, roll_no: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema); 