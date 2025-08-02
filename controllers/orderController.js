const Order = require('../models/Order');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const {sendEmail} = require('../utils/emailSender');

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingInfo,
      paymentMethod,
      couponCode
    } = req.body;

    // Validate order items
    if (!orderItems || orderItems.length === 0) {
      return next(new ErrorResponse('No order items', 400));
    }

    // Calculate prices
    let itemsPrice = 0;
    const items = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);

      if (!product) {
        return next(
          new ErrorResponse(`Product not found with id of ${item.product}`, 404)
        );
      }

      if (product.stock < item.quantity) {
        return next(
          new ErrorResponse(
            `Not enough stock for product ${product.name}. Only ${product.stock} available`,
            400
          )
        );
      }

      itemsPrice += product.price * item.quantity;

      items.push({
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0].url,
        product: item.product
      });
    }

    // Apply coupon if provided
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        isActive: true,
        startDate: { $lte: Date.now() },
        endDate: { $gte: Date.now() }
      });

      if (coupon) {
        if (itemsPrice >= coupon.minPurchase) {
          const discount = (itemsPrice * coupon.discount) / 100;
          discountAmount = Math.min(discount, coupon.maxDiscount);
        }
      }
    }

    // Create order
    const order = await Order.create({
      orderItems: items,
      shippingInfo,
      paymentMethod,
      itemsPrice,
      taxPrice: 0.1 * itemsPrice,
      shippingPrice: itemsPrice > 100 ? 0 : 10,
      totalPrice: itemsPrice + 0.1 * itemsPrice + (itemsPrice > 100 ? 0 : 10) - discountAmount,
      user: req.user.id,
      couponApplied: couponCode ? coupon._id : undefined,
      discountAmount
    });

    // Update product stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      product.stock -= item.quantity;
      await product.save();
    }

    // Send email confirmation
    const message = `Your order has been placed successfully. Order ID: ${order._id}`;

    await sendEmail({
      email: req.user.email,
      subject: 'Order Confirmation',
      message
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (!order) {
      return next(
        new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is order owner or admin
    if (
      order.user._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this order`,
          401
        )
      );
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged in user orders
// @route   GET /api/v1/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private/Admin
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('user', 'name email');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(
        new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
      );
    }

    if (order.orderStatus === 'Delivered') {
      return next(
        new ErrorResponse('Order has already been delivered', 400)
      );
    }

    if (req.body.status === 'Shipped') {
      order.shippedAt = Date.now();
    }

    if (req.body.status === 'Delivered') {
      order.deliveredAt = Date.now();
    }

    order.orderStatus = req.body.status;
    await order.save();

    // Send email notification
    const message = `Your order status has been updated to ${req.body.status}`;

    await sendEmail({
      email: order.user.email,
      subject: 'Order Status Update',
      message
    });

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete order
// @route   DELETE /api/v1/orders/:id
// @access  Private/Admin
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(
        new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
      );
    }

    await order.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};