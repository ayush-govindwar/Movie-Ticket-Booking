const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { StatusCodes } = require('http-status-codes');

const addBooking = async (req, res) => {
    const { userId } = req.user; // Extract userId from authenticated user
    const { showId, seatsBooked } = req.body;
  
    // Check if showId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(showId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid Show ID',
      });
    }
  
    // Check if the show exists
    const show = await Show.findById(showId);
    if (!show) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Show not found',
      });
    }
  
    // Check if there are enough seats available
    if (show.bookedSeats + seatsBooked > show.totalSeats) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Not enough seats available',
      });
    }
  
    // Calculate total price
    const totalPrice = seatsBooked * show.basePrice;
  
    try {
      // Create the booking
      const booking = await Booking.create({
        userId,
        showId,
        seatsBooked,
        totalPrice,
      });
  
      // Update the show's bookedSeats
      show.bookedSeats += seatsBooked;
      await show.save();
  
      // Check if all seats are booked
      if (show.bookedSeats === show.totalSeats) {
        return res.status(StatusCodes.CREATED).json({
          message: 'Booking successful. All seats are now booked.',
          booking,
        });
      }
  
      res.status(StatusCodes.CREATED).json({
        message: 'Booking successful',
        booking,
      });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Failed to create booking',
        error: error.message,
      });
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

module.exports = {addBooking , getBooking}