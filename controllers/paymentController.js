const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { calculateDynamicPrice } = require('../utils/pricing')

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createRazorpayOrder = async (req, res) => {
  const { showId, seatsBooked } = req.body;
  const { userId } = req.user;

  try {
    // Validate show
    const show = await Show.findById(showId);
    if (!show) return res.status(404).json({ message: 'Show not found' });

    // Calculate dynamic price
    const pricePerSeat = calculateDynamicPrice({
      basePrice: show.basePrice,
      bookedSeats: show.bookedSeats,
      seatsBooked,
      totalSeats: show.totalSeats,
      showTime: show.showTime,
      bookingTime: new Date(),
    });

    const totalPrice = pricePerSeat * seatsBooked;

    // Create Razorpay order
    const options = {
      amount: totalPrice * 100, // Convert to paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        showId: showId.toString(),
        seatsBooked: seatsBooked.toString()
      }
    };

    const order = await razorpay.orders.create(options);

    // Create temporary booking
    const booking = await Booking.create({
      userId,
      showId,
      seatsBooked,
      totalPrice,
      razorpayOrderId: order.id,
      paymentStatus: 'pending'
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      bookingId: booking._id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handlePaymentWebhook = async (req, res) => {
  const body = req.body;
  const signature = req.headers['x-razorpay-signature'];

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (body.event) {
      case 'payment.captured':
        await handleSuccessfulPayment(body.payload.payment.entity);
        break;
        
      case 'payment.failed':
        await handleFailedPayment(body.payload.payment.entity);
        break;
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper functions
const handleSuccessfulPayment = async (payment) => {
  const booking = await Booking.findOne({ razorpayOrderId: payment.order_id });
  
  booking.paymentStatus = 'success';
  booking.razorpayPaymentId = payment.id;
  await booking.save();

  // Update show seats and attendees
  const show = await Show.findById(booking.showId);
  show.bookedSeats += booking.seatsBooked;
  show.attendees.push(booking.userId);
  await show.save();
};

const handleFailedPayment = async (payment) => {
  const booking = await Booking.findOne({ razorpayOrderId: payment.order_id });
  booking.paymentStatus = 'failed';
  await booking.save();
};



module.exports = { createRazorpayOrder, handlePaymentWebhook };