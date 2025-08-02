const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllOrders,
  getMonthlyRevenue,
  getInventory,
  getLowStockItems,
  updateInventory,
  getInventoryHistory
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/orders', getAllOrders);
router.get('/revenue', getMonthlyRevenue);
router.get('/inventory', getInventory);
router.get('/inventory/lowstock', getLowStockItems);
router.put('/inventory/:id', updateInventory);
router.get('/inventory/:id/history', getInventoryHistory);

module.exports = router;