const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative']
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  history: [
    {
      date: {
        type: Date,
        default: Date.now
      },
      quantity: Number,
      change: Number,
      reason: String,
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    }
  ]
});

// Update lastUpdated when inventory changes
inventorySchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Add to history when inventory changes
inventorySchema.pre('save', function(next) {
  if (this.isModified('quantity')) {
    const change = this.quantity - (this._originalQuantity || this.quantity);
    this.history.push({
      quantity: this.quantity,
      change,
      reason: 'Inventory adjustment'
    });
  }
  next();
});

// Track original quantity
inventorySchema.pre('save', function(next) {
  if (this.isNew) {
    this._originalQuantity = this.quantity;
  } else {
    this._originalQuantity = this._originalQuantity || this.quantity;
  }
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);