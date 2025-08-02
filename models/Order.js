const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  shippingInfo: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    pinCode: {
      type: Number,
      required: true
    },
    phoneNo: {
      type: String,
      required: true
    }
  },
  orderItems: [
    {
      name: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      image: {
        type: String,
        required: true
      },
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: true
      }
    }
  ],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  paymentInfo: {
    id: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    },
    paymentMethod: {
      type: String,
      required: true
    }
  },
  paidAt: {
    type: Date,
    required: true
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  orderStatus: {
    type: String,
    required: true,
    default: 'Processing'
  },
  deliveredAt: Date,
  couponApplied: {
    type: mongoose.Schema.ObjectId,
    ref: 'Coupon'
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate prices before saving
orderSchema.pre('save', async function(next) {
  // Calculate items price
  this.itemsPrice = this.orderItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Calculate shipping price (example: free for orders over $100)
  this.shippingPrice = this.itemsPrice > 100 ? 0 : 10;

  // Calculate tax (10% of items price)
  this.taxPrice = Number((0.1 * this.itemsPrice).toFixed(2));

  // Calculate total price
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice - (this.discountAmount || 0);

  next();
});

module.exports = mongoose.model('Order', orderSchema);