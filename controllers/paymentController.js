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

// Helper function Release locked seats
const releaseSeats = async (showId, seats) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const show = await Show.findById(showId).session(session);
    if (!show) throw new Error(`Show not found: ${showId}`);
    
    show.lockedSeats = Math.max(show.lockedSeats - seats, 0);
    await show.save({ session });
    await session.commitTransaction();
    console.log(`Released ${seats} seats for show ${showId}`);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error releasing seats:', error);
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
      
      if (!showId || !seatsBooked || seatsBooked <= 0) {
        return res.status(400).json({ 
          message: 'Invalid request. Please provide showId and seatsBooked (>0)' 
        });
      }
      
      const { userId } = req.user;
  
      // 1. Verify seat availability with locks
      const show = await Show.findById(showId).session(session);
      if (!show) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Show not found' });
      }
      
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
        amount: Math.round(totalPrice * 100), // Convert to smallest currency unit (paise)
        currency: "INR",
        receipt: `booking_${booking[0]._id}`,
        notes: {
          bookingId: booking[0]._id.toString(),
          showId: showId.toString(),
          userId: userId.toString()
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
      console.log(`Created payment URL: ${paymentUrl} for booking ${booking[0]._id}`);
      
      res.status(200).json({ 
        message: 'Order created successfully',
        orderId: order.id,
        bookingId: booking[0]._id,
        paymentUrl,
        amount: totalPrice
      });
  
    } catch (error) {
      await session.abortTransaction();
      console.error('Order creation failed:', error);
      res.status(500).json({ error: 'Payment initialization failed', details: error.message });
    } finally {
      session.endSession();
    }
};

// Generate payment page
const getPaymentPage = async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).send('Order ID is required');
      }
      
      const order = await razorpay.orders.fetch(orderId);
      if (!order) {
        return res.status(404).send('Order not found');
      }
      
      const booking = await Booking.findOne({ razorpayOrderId: orderId }).populate('showId');
      if (!booking) {
        return res.status(404).send('Booking not found');
      }
      
      // Check if booking is expired
      if (booking.lockedUntil && booking.lockedUntil < new Date()) {
        return res.status(400).send(`
          <html>
            <head><title>Payment Expired</title></head>
            <body>
              <h2>Payment Expired</h2>
              <p>Your booking reservation has expired. Please start a new booking.</p>
            </body>
          </html>
        `);
      }
      
      // Get show details for display
      const show = booking.showId;
      const formattedShowTime = new Date(show.showTime).toLocaleString();
      
      // Render payment page
      res.send(`
        <html>
          <head>
            <title>Payment Gateway</title>
            <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .booking-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
              button { background: #3498db; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; }
            </style>
          </head>
          <body>
            <h2>Complete Your Payment</h2>
            
            <div class="booking-details">
              <p><strong>Show:</strong> ${show.theater}</p>
              <p><strong>Date & Time:</strong> ${formattedShowTime}</p>
              <p><strong>Seats:</strong> ${booking.seatsBooked}</p>
              <p><strong>Amount:</strong> ₹${order.amount/100}</p>
              <p><strong>Booking ID:</strong> ${booking._id}</p>
              <p><strong>Reservation expires in:</strong> <span id="timer"></span></p>
            </div>
            
            <button id="pay-button">Pay Now</button>
            
            <script>
              // Timer functionality
              function updateTimer() {
                const expiryTime = new Date("${booking.lockedUntil}").getTime();
                const now = new Date().getTime();
                const timeLeft = expiryTime - now;
                
                if (timeLeft <= 0) {
                  document.getElementById("timer").innerHTML = "Expired";
                  document.getElementById("pay-button").disabled = true;
                  alert("Your booking reservation has expired. Please start a new booking.");
                  window.location.reload();
                  return;
                }
                
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                document.getElementById("timer").innerHTML = minutes + "m " + seconds + "s";
              }
              
              // Update every second
              setInterval(updateTimer, 1000);
              updateTimer();
              
              // Payment integration
              document.getElementById('pay-button').addEventListener('click', function() {
                const options = {
                  key: '${process.env.RAZORPAY_KEY_ID}',
                  order_id: '${orderId}',
                  amount: ${order.amount},
                  currency: 'INR',
                  name: 'Movie Booking',
                  description: 'Booking ${booking._id}',
                  handler: function(response) {
                    // Redirect to success page with payment ID
                    window.location.href = '/api/v1/payment/payment-success?razorpay_payment_id=' + 
                      response.razorpay_payment_id + 
                      '&razorpay_order_id=' + response.razorpay_order_id +
                      '&razorpay_signature=' + response.razorpay_signature;
                  },
                  prefill: {
                    name: 'Customer',
                    email: 'customer@example.com'
                  },
                  theme: { color: '#3498db' }
                };
                
                const rzp = new Razorpay(options);
                rzp.on('payment.failed', function(response) {
                  window.location.href = '/api/v1/payment/payment-failed?error=' + 
                    encodeURIComponent(response.error.description) +
                    '&order_id=' + response.error.metadata.order_id;
                });
                rzp.open();
              });
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error generating payment page:', error);
      res.status(400).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h2>Payment Error</h2>
            <p>An error occurred: ${error.message}</p>
          </body>
        </html>
      `);
    }
};

// Payment success handler
const handlePaymentSuccess = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.query;
  
  // Verify signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');
    
  if (generatedSignature !== razorpay_signature) {
    return res.status(400).send(`
      <html>
        <head><title>Invalid Payment</title></head>
        <body>
          <h2>Invalid Payment</h2>
          <p>The payment signature could not be verified.</p>
        </body>
      </html>
    `);
  }
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      throw new Error('Payment not captured');
    }
    
    // Find booking
    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id })
      .session(session);
      
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Process successful payment
    booking.paymentStatus = 'success';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.lockedSeats = 0;
    booking.lockedUntil = null;
    await booking.save({ session });
    
    // Update show
    const show = await Show.findById(booking.showId).session(session);
    show.bookedSeats += booking.seatsBooked;
    show.lockedSeats = Math.max(show.lockedSeats - booking.seatsBooked, 0);
    
    await show.save({ session });
    console.log(`Updated show ${show._id} booked seats to ${show.bookedSeats}`);
    
    await session.commitTransaction();
    
    // Send success page
    res.send(`
      <html>
        <head>
          <title>Payment Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
            .success-box { background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; }
            h1 { color: #155724; }
          </style>
        </head>
        <body>
          <div class="success-box">
            <h1>Payment Successful!</h1>
            <p>Your booking has been confirmed.</p>
            <p>Booking ID: ${booking._id}</p>
            <p>Payment ID: ${razorpay_payment_id}</p>
          </div>
          <p>Thank you for your booking!</p>
        </body>
      </html>
    `);
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Payment success handler error:', error);
    res.status(500).send(`
      <html>
        <head><title>Payment Processing Error</title></head>
        <body>
          <h2>Payment Processing Error</h2>
          <p>An error occurred while processing your payment: ${error.message}</p>
          <p>Your payment may have been successful, but we couldn't update your booking.</p>
          <p>Please contact customer support with your payment ID: ${razorpay_payment_id}</p>
        </body>
      </html>
    `);
  } finally {
    session.endSession();
  }
};

// Payment failure handler
const handlePaymentFailure = async (req, res) => {
  const { error, order_id } = req.query;
  
  try {
    // Find and update booking
    const booking = await Booking.findOne({ razorpayOrderId: order_id });
    
    if (booking) {
      await handleFailedPayment(booking);
    }
    
    // Send failure page
    res.send(`
      <html>
        <head>
          <title>Payment Failed</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
            .error-box { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 5px; margin: 20px 0; }
            h1 { color: #721c24; }
          </style>
        </head>
        <body>
          <div class="error-box">
            <h1>Payment Failed</h1>
            <p>Your payment could not be processed.</p>
            <p>Error: ${error || 'Unknown error'}</p>
          </div>
          <p>Please try again or contact customer support if the problem persists.</p>
        </body>
      </html>
    `);
    
  } catch (err) {
    console.error('Payment failure handler error:', err);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h2>System Error</h2>
          <p>An error occurred while processing your payment failure: ${err.message}</p>
        </body>
      </html>
    `);
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
  
      // Find booking from the order
      const order = await razorpay.orders.fetch(payment.order_id);
      const bookingId = order.notes.bookingId;
      
      const booking = await Booking.findById(bookingId)
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
      // Use provided session or create a new one
      const useProvidedSession = !!session;
      if (!session) {
        session = await mongoose.startSession();
        session.startTransaction();
      }
      
      // Validate payment amount matches booking
      const expectedAmount = booking.totalPrice * 100;
      if (payment.amount !== expectedAmount) {
        console.warn(`Payment amount mismatch: expected ${expectedAmount}, got ${payment.amount}`);
      }
  
      // Update booking
      booking.paymentStatus = 'success';
      booking.razorpayPaymentId = payment.id;
      booking.lockedSeats = 0;
      booking.lockedUntil = null;
      await booking.save({ session });
  
      // Update show seats - crucial part
      const show = await Show.findById(booking.showId).session(session);
      if (!show) throw new Error(`Show not found: ${booking.showId}`);
      
      show.bookedSeats += booking.seatsBooked;
      show.lockedSeats = Math.max(show.lockedSeats - booking.seatsBooked, 0);
      
      // Remove expired lock if exists
      if (show.lockedUntil && show.lockedUntil < new Date()) {
        show.lockedUntil = null;
      }
      
      await show.save({ session });
      console.log(`Updated show ${show._id} booked seats to ${show.bookedSeats}`);
      
      // If we created our own session, commit it
      if (!useProvidedSession) {
        await session.commitTransaction();
        session.endSession();
      }
  
    } catch (error) {
      // If we created our own session, abort it
      if (session && !session.inTransaction()) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Failed to process successful payment:', error);
      throw error; // Re-throw to trigger transaction rollback
    }
};

// Failed payment handler
const handleFailedPayment = async (booking, session) => {
  try {
    // Use provided session or create a new one
    const useProvidedSession = !!session;
    if (!session) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    
    booking.paymentStatus = 'failed';
    booking.lockedSeats = 0;
    booking.lockedUntil = null;
    await booking.save({ session });
  
    // Release locked seats
    const show = await Show.findById(booking.showId).session(session);
    if (!show) throw new Error(`Show not found: ${booking.showId}`);
    
    show.lockedSeats = Math.max(show.lockedSeats - booking.seatsBooked, 0);
    await show.save({ session });
    
    // If we created our own session, commit it
    if (!useProvidedSession) {
      await session.commitTransaction();
      session.endSession();
    }
    
  } catch (error) {
    // If we created our own session, abort it
    if (session && !session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('Failed to process failed payment:', error);
    throw error;
  }
};

// Background job to release expired locks
const startLockCleanupJob = () => {
  console.log('Starting seat lock cleanup job...');
  
  setInterval(async () => {
    try {
      const now = new Date();
      console.log(`Running cleanup at ${now.toISOString()}`);
      
      const expiredBookings = await Booking.find({
        paymentStatus: 'pending',
        lockedUntil: { $lte: now }
      });
  
      console.log(`Found ${expiredBookings.length} expired bookings`);
      
      for (const booking of expiredBookings) {
        try {
          console.log(`Processing expired booking: ${booking._id}`);
          await releaseSeats(booking.showId, booking.lockedSeats || booking.seatsBooked);
          
          await Booking.findByIdAndUpdate(booking._id, {
            paymentStatus: 'expired',
            lockedSeats: 0,
            lockedUntil: null
          });
          
          console.log(`Updated booking ${booking._id} to expired`);
        } catch (err) {
          console.error(`Error processing expired booking ${booking._id}:`, err);
        }
      }
    } catch (error) {
      console.error('Error in cleanup job:', error);
    }
  }, 60 * 1000); // Run every minute
};

// Add new routes/endpoints
module.exports = { 
  createRazorpayOrder, 
  handlePaymentWebhook,
  startLockCleanupJob,
  getPaymentPage,
  handlePaymentSuccess,
  handlePaymentFailure
};