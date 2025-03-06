require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { calculateDynamicPrice } = require('../utils/pricing');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Helper: Release locked seats
const releaseSeats = async (showId, seats) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const show = await Show.findById(showId).session(session);
    show.lockedSeats = Math.max(show.lockedSeats - seats, 0);
    await show.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Create order with seat locking
const createRazorpayOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { showId, seatsBooked } = req.body;
      const { userId } = req.user;
  
      // 1. Verify seat availability with locks
      const show = await Show.findById(showId).session(session);
      const totalReserved = show.bookedSeats + show.lockedSeats;
      
      if (totalReserved + seatsBooked > show.totalSeats) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Not enough seats available' });
      }
  
      // 2. Calculate price
      const pricePerSeat = calculateDynamicPrice({
        basePrice: show.basePrice,
        bookedSeats: show.bookedSeats,
        seatsBooked,
        totalSeats: show.totalSeats,
        showTime: show.showTime,
        bookingTime: new Date(),
      });
  
      const totalPrice = pricePerSeat * seatsBooked;
  
      // 3. Lock seats for 10 minutes
      const lockDuration = 10 * 60 * 1000; // 10 minutes in ms
      const lockedUntil = new Date(Date.now() + lockDuration);
  
      // Update show locks
      show.lockedSeats += seatsBooked;
      show.lockedUntil = lockedUntil;
      await show.save({ session });
  
      // 4. Create temporary booking
      const booking = await Booking.create([{
        userId,
        showId,
        seatsBooked,
        totalPrice,
        paymentStatus: 'pending',
        lockedSeats: seatsBooked,
        lockedUntil,
        razorpayOrderId: null
      }], { session });
  
      // 5. Create Razorpay order
      const order = await razorpay.orders.create({
        amount: totalPrice * 100,
        currency: "INR",
        receipt: `booking_${booking[0]._id}`,
        notes: {
          bookingId: booking[0]._id.toString(),
          showId: showId.toString()
        }
      });
  
      // 6. Update booking with order ID
      await Booking.findByIdAndUpdate(
        booking[0]._id,
        { razorpayOrderId: order.id },
        { session }
      );
  
      await session.commitTransaction();
  
      // Generate payment URL and return
      const paymentUrl = `${req.protocol}://${req.get('host')}/api/v1/payment/pay/${order.id}`;
      res.status(200).json({ paymentUrl });
  
    } catch (error) {
      await session.abortTransaction();
      console.error('Order creation failed:', error);
      res.status(500).json({ error: 'Payment initialization failed' });
    } finally {
      session.endSession();
    }
  };

// Webhook handler
const handlePaymentWebhook = async (req, res) => {
    const body = req.body;
    const signature = req.headers['x-razorpay-signature'];
  
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');
  
    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
  
    const session = await mongoose.startSession();
    try {
      await session.startTransaction();
      
      const payment = body.payload.payment?.entity;
      if (!payment) throw new Error('Invalid payment data');
  
      // Add additional validation
      const booking = await Booking.findById(payment.notes?.bookingId)
        .session(session)
        .populate('showId');
  
      if (!booking) throw new Error('Booking not found');
      if (booking.paymentStatus === 'success') {
        return res.status(200).json({ status: 'already processed' });
      }
  
      switch (body.event) {
        case 'payment.captured':
          console.log('Processing successful payment for booking:', booking._id);
          await handleSuccessfulPayment(booking, payment, session);
          break;
          
        case 'payment.failed':
          console.log('Processing failed payment for booking:', booking._id);
          await handleFailedPayment(booking, session);
          break;
      }
  
      await session.commitTransaction();
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      await session.abortTransaction();
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      session.endSession();
    }
  };
// Successful payment handler
const handleSuccessfulPayment = async (booking, payment, session) => {
    try {
      // Validate payment amount matches booking
      if (payment.amount !== booking.totalPrice * 100) {
        throw new Error('Payment amount mismatch');
      }
  
      // Update booking
      booking.paymentStatus = 'success';
      booking.razorpayPaymentId = payment.id;
      booking.lockedSeats = 0;
      booking.lockedUntil = null;
      await booking.save({ session });
  
      // Update show seats - crucial part
      const show = await Show.findById(booking.showId).session(session);
      show.bookedSeats += booking.seatsBooked;
      show.lockedSeats = Math.max(show.lockedSeats - booking.seatsBooked, 0);
      
      // Remove expired lock if exists
      if (show.lockedUntil < new Date()) {
        show.lockedUntil = null;
      }
      
      await show.save({ session });
      console.log(`Updated show ${show._id} booked seats to ${show.bookedSeats}`);
  
    } catch (error) {
      console.error('Failed to process successful payment:', error);
      throw error; // Re-throw to trigger transaction rollback
    }
  };
// Failed payment handler
const handleFailedPayment = async (booking, session) => {
  booking.paymentStatus = 'failed';
  booking.lockedSeats = 0;
  booking.lockedUntil = null;
  await booking.save({ session });

  // Release locked seats
  const show = await Show.findById(booking.showId).session(session);
  show.lockedSeats = Math.max(show.lockedSeats - booking.seatsBooked, 0);
  await show.save({ session });
};

// Background job to release expired locks
const startLockCleanupJob = () => {
  setInterval(async () => {
    const expiredBookings = await Booking.find({
      paymentStatus: 'pending',
      lockedUntil: { $lte: new Date() }
    });

    for (const booking of expiredBookings) {
      await releaseSeats(booking.showId, booking.seatsBooked);
      await Booking.findByIdAndUpdate(booking._id, {
        paymentStatus: 'failed',
        lockedSeats: 0,
        lockedUntil: null
      });
    }
  }, 60 * 1000); // Run every minute
};

// Add this new function at the bottom
const getPaymentPage = async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await razorpay.orders.fetch(orderId);
      const booking = await Booking.findOne({ razorpayOrderId: orderId });
  
      res.send(`
        <html>
          <head>
            <title>Payment Gateway</title>
            <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          </head>
          <body>
            <script>
              function handlePayment() {
                const options = {
                  key: '${process.env.RAZORPAY_KEY_ID}',
                  order_id: '${orderId}',
                  amount: ${order.amount},
                  currency: 'INR',
                  name: 'Movie Booking',
                  description: 'Booking ${booking._id}',
                  handler: function(response) {
                    window.location.href = '/api/v1/payment/payment-success/' + response.razorpay_payment_id;
                  },
                  prefill: {
                    name: '${req.user?.name || 'Customer'}',
                    email: '${req.user?.email || 'customer@example.com'}'
                  },
                  theme: { color: '#F37254' }
                };
  
                const rzp = new Razorpay(options);
                rzp.on('payment.failed', function(response) {
                  window.location.href = '/api/v1/payment/payment-failed?error=' + 
                    encodeURIComponent(response.error.description);
                });
                rzp.open();
              }
              window.onload = handlePayment;
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(400).send('Invalid payment request');
    }
  };



// Update exports
module.exports = { 
createRazorpayOrder, 
handlePaymentWebhook,
startLockCleanupJob,
getPaymentPage
};