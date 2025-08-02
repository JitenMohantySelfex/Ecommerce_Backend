const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide coupon code'],
    unique: true,
    uppercase: true
  },
  discount: {
    type: Number,
    required: [true, 'Please provide discount amount'],
    min: [1, 'Discount must be at least 1%'],
    max: [100, 'Discount cannot exceed 100%']
  },
  minPurchase: {
    type: Number,
    required: [true, 'Please provide minimum purchase amount']
  },
  maxDiscount: {
    type: Number,
    required: [true, 'Please provide maximum discount amount']
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide start date'],
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide end date']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Check if coupon is valid
couponSchema.methods.isValid = function() {
  return this.isActive && this.startDate <= Date.now() && this.endDate >= Date.now();
};

module.exports = mongoose.model('Coupon', couponSchema);