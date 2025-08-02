const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get admin dashboard stats
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'Processing' }),
      Order.countDocuments({ orderStatus: 'Delivered' }),
      Order.aggregate([
        {
          $match: { 'paymentInfo.status': 'paid' }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users (for admin)
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user role
// @route   PUT /api/v1/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user (admin)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all orders (for admin)
// @route   GET /api/v1/admin/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get monthly revenue
// @route   GET /api/v1/admin/revenue
// @access  Private/Admin
exports.getMonthlyRevenue = async (req, res, next) => {
  try {
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          'paymentInfo.status': 'paid',
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: monthlyRevenue
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Get all inventory items
// @route   GET /api/v1/admin/inventory
// @access  Private/Admin
exports.getInventory = async (req, res, next) => {
  try {
    // Add pagination, filtering, and sorting if needed
    const inventory = await Inventory.find()
      .populate({
        path: 'product',
        select: 'name price images stock'
      })
      .sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      count: inventory.length,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get low stock items
// @route   GET /api/v1/admin/inventory/lowstock
// @access  Private/Admin
exports.getLowStockItems = async (req, res, next) => {
  try {
    const lowStockThreshold = req.query.threshold || 10; // Default threshold is 10
    
    const lowStockItems = await Inventory.find({
      quantity: { $lte: lowStockThreshold }
    })
    .populate({
      path: 'product',
      select: 'name price images stock'
    })
    .sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      threshold: lowStockThreshold,
      data: lowStockItems
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update inventory item
// @route   PUT /api/v1/admin/inventory/:id
// @access  Private/Admin
exports.updateInventory = async (req, res, next) => {
  try {
    const { quantity, reason } = req.body;

    // Find inventory item
    let inventory = await Inventory.findById(req.params.id);
    
    if (!inventory) {
      return next(
        new ErrorResponse(`Inventory item not found with id of ${req.params.id}`, 404)
      );
    }

    // Calculate the change in quantity
    const change = quantity - inventory.quantity;

    // Update the inventory
    inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { 
        quantity,
        $push: {
          history: {
            quantity,
            change,
            reason: reason || 'Inventory adjustment',
            user: req.user.id
          }
        }
      },
      { new: true, runValidators: true }
    ).populate({
      path: 'product',
      select: 'name price'
    });

    // Update product stock to match inventory
    await Product.findByIdAndUpdate(
      inventory.product,
      { stock: quantity },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory history for an item
// @route   GET /api/v1/admin/inventory/:id/history
// @access  Private/Admin
exports.getInventoryHistory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.id)
      .select('history product')
      .populate({
        path: 'history.user',
        select: 'name email'
      })
      .populate({
        path: 'product',
        select: 'name'
      });

    if (!inventory) {
      return next(
        new ErrorResponse(`Inventory item not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      product: inventory.product.name,
      count: inventory.history.length,
      data: inventory.history
    });
  } catch (err) {
    next(err);
  }
};