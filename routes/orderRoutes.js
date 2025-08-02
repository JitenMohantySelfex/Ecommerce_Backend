const express = require('express');
const {
  createOrder,
  getOrder,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .post(protect, createOrder)
  .get(protect, authorize('admin'), getOrders);

router.route('/myorders').get(protect, getMyOrders);

router
  .route('/:id')
  .get(protect, getOrder)
  .delete(protect, authorize('admin'), deleteOrder);

router
  .route('/:id/status')
  .put(protect, authorize('admin'), updateOrderStatus);

module.exports = router;