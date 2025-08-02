const razorpay = require('../config/razorpay');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Process payment
// @route   POST /api/v1/payments/process
// @access  Private
exports.processPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return next(
        new ErrorResponse(`Order not found with id of ${orderId}`, 404)
      );
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to pay for this order`,
          401
        )
      );
    }

    // Check if order is already paid
    if (order.paymentInfo.status === 'paid') {
      return next(
        new ErrorResponse('Order has already been paid', 400)
      );
    }

    // Create Razorpay order
    const options = {
      amount: order.totalPrice * 100, // amount in the smallest currency unit (paise)
      currency: 'INR',
      receipt: `order_${order._id}`,
      payment_capture: 1 // auto capture payment
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order: razorpayOrder
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify payment
// @route   POST /api/v1/payments/verify
// @access  Private
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify payment signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return next(new ErrorResponse('Payment verification failed', 400));
    }

    // Get order ID from receipt
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    const orderId = razorpayOrder.receipt.split('_')[1];

    // Update order payment status
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        'paymentInfo.id': razorpay_payment_id,
        'paymentInfo.status': 'paid',
        paidAt: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get payment details
// @route   GET /api/v1/payments/:orderId
// @access  Private
exports.getPaymentDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return next(
        new ErrorResponse(`Order not found with id of ${req.params.orderId}`, 404)
      );
    }

    // Check if order belongs to user or admin
    if (
      order.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this payment`,
          401
        )
      );
    }

    res.status(200).json({
      success: true,
      data: order.paymentInfo
    });
  } catch (err) {
    next(err);
  }
};