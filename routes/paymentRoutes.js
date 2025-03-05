
const express = require('express');
const router = express.Router();
const { createRazorpayOrder, handlePaymentWebhook } = require('../controllers/paymentController');
const { authenticateUser } = require('../middleware/authentication.js');

router.post('/create-order', authenticateUser, createRazorpayOrder);
router.post('/webhook', express.raw({ type: 'application/json' }), handlePaymentWebhook);

module.exports = router;