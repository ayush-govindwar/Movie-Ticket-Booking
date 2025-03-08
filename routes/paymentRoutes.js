// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authentication');
const { 
  createRazorpayOrder, 
  handlePaymentWebhook,
  getPaymentPage,
  handlePaymentSuccess,
  handlePaymentFailure
} = require('../controllers/paymentController');

// Create order route
router.post('/create-order', authenticateUser, createRazorpayOrder);

// Payment page
router.get('/pay/:orderId', getPaymentPage);

// Payment callbacks
router.get('/payment-success', handlePaymentSuccess);
router.get('/payment-failed', handlePaymentFailure);

// Webhook for Razorpay
router.post('/webhook', handlePaymentWebhook);

module.exports = router;