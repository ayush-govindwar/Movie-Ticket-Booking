
const express = require('express');
const router = express.Router();
const { createRazorpayOrder, handlePaymentWebhook, getPaymentPage} = require('../controllers/paymentController');
const { authenticateUser } = require('../middleware/authentication.js');

router.post('/create-order', authenticateUser, createRazorpayOrder);
router.get('/pay/:orderId', getPaymentPage);
router.post('/webhook', express.raw({ type: 'application/json' }), handlePaymentWebhook);
router.get('/payment-success/:paymentId', (req, res) => res.send('Payment Successful!'));
router.get('/payment-failed', (req, res) => res.send('Payment Failed!'));
module.exports = router;