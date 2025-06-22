const mongoose = require('mongoose');

const managerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  gym_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  role: {
    type: String,
    default: 'manager'
  }
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Manager', managerSchema);
