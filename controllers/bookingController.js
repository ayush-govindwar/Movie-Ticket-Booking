const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { StatusCodes } = require('http-status-codes');
const { calculateDynamicPrice } = require('../utils/pricing');

const addBooking = async (req, res) => {
  const { userId } = req.user;
  const { showId, seatsBooked } = req.body;

  if (!mongoose.Types.ObjectId.isValid(showId)) {
    return res.status(400).json({ message: 'Invalid Show ID' });
  }

  const show = await Show.findById(showId);
  if (!show) return res.status(404).json({ message: 'Show not found' });

  if (show.bookedSeats + seatsBooked > show.totalSeats) {
    return res.status(400).json({ message: 'Not enough seats available' });
  }

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

  try {
    const booking = await Booking.create({ userId, showId, seatsBooked, totalPrice });
    
    show.bookedSeats += seatsBooked;
    await show.save();

    res.status(201).json({
      message: show.bookedSeats === show.totalSeats 
        ? 'Booking successful. All seats booked!' 
        : 'Booking successful',
      booking
    });
  } catch (error) {
    res.status(400).json({ message: 'Booking failed', error: error.message });
  }
};

const simulatePrice = async (req, res) => {
  const { seatsBooked, currentBookedSeats, totalSeats, basePrice, showTime, bookingTime } = req.body;

  // Validation
  if ([seatsBooked, currentBookedSeats, totalSeats, basePrice].some(v => typeof v !== 'number') || 
      !showTime || !bookingTime) {
    return res.status(400).json({ message: 'Invalid parameters' });
  }

  try {
    const pricePerSeat = calculateDynamicPrice({
      basePrice,
      bookedSeats: currentBookedSeats,
      seatsBooked,
      totalSeats,
      showTime: new Date(showTime),
      bookingTime: new Date(bookingTime),
    });

    res.json({
      pricePerSeat,
      totalPrice: pricePerSeat * seatsBooked
    });
  } catch (error) {
    res.status(500).json({ message: 'Simulation failed', error: error.message });
  }
};

const getBooking = async (req, res) => {
const { userId } = req.user; // Extract userId from authenticated user

try {
    // Fetch all bookings for the user
    const bookings = await Booking.find({ userId }).populate('showId', 'theater showTime');

    res.status(StatusCodes.OK).json({ bookings });
} catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({
    message: 'Failed to fetch bookings',
    error: error.message,
    });
}
};

module.exports = {addBooking , getBooking , simulatePrice }