const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  showId: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },
  seatsBooked: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  bookedAt: { type: Date, default: Date.now },
  lockedSeats: { type: Number }, //per booking
  lockedUntil: { type: Date },
});

module.exports = mongoose.model("Booking", bookingSchema);