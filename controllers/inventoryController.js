const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all inventory items
// @route   GET /api/v1/inventory
// @access  Private/Admin
exports.getInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.find().populate('product', 'name price');

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
// @route   GET /api/v1/inventory/lowstock
// @access  Private/Admin
exports.getLowStockItems = async (req, res, next) => {
  try {
    const lowStockItems = await Inventory.find({
      quantity: { $lte: 10 }
    }).populate('product', 'name price');

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update inventory
// @route   PUT /api/v1/inventory/:id
// @access  Private/Admin
exports.updateInventory = async (req, res, next) => {
  try {
    const { quantity, reason } = req.body;

    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { quantity },
      {
        new: true,
        runValidators: true
      }
    );

    if (!inventory) {
      return next(
        new ErrorResponse(`Inventory not found with id of ${req.params.id}`, 404)
      );
    }

    // Add to history
    inventory.history.push({
      quantity,
      change: quantity - inventory._originalQuantity,
      reason
    });

    await inventory.save();

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory history
// @route   GET /api/v1/inventory/:id/history
// @access  Private/Admin
exports.getInventoryHistory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return next(
        new ErrorResponse(`Inventory not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      count: inventory.history.length,
      data: inventory.history
    });
  } catch (err) {
    next(err);
  }
};