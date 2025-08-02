const express = require('express');
const {
  processPayment,
  verifyPayment,
  getPaymentDetails
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/process', protect, processPayment);
router.post('/verify', protect, verifyPayment);
router.get('/:orderId', protect, getPaymentDetails);

module.exports = router;