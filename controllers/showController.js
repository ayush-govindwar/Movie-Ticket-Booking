const Show = require('../models/Show')
const Movie = require('../models/Movies')
const User = require('../models/User')
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')
const sendUpdatesEmail = require('../utils/sendUpdatesEmail');


const getAllShows = async (req, res) => {
    try {
      // Fetch all shows from the database
      const shows = await Show.find({});
  
      // Group shows by movieId
      const showsByMovieId = shows.reduce((acc, show) => {
        const movieId = show.movieId.toString(); // Convert objectId to string
        if (!acc[movieId]) {
          acc[movieId] = [];
        }
        acc[movieId].push(show);
        return acc;
      }, {}); // Build obj
  
      res.status(StatusCodes.OK).json({ showsByMovieId });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Failed to fetch shows',
        error: error.message,
      });
    }
  };

const addShow = async (req, res) => {
const movieId = req.params.Id;
const { theater, showTime, totalSeats, bookedSeats, basePrice } = req.body;


if (!mongoose.Types.ObjectId.isValid(movieId)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
    message: 'Invalid Movie ID',
    });
}


const movie = await Movie.findById(movieId);
if (!movie) {
    return res.status(StatusCodes.NOT_FOUND).json({
    message: 'Movie not found',
    });
}


const showData = {
    movieId: new mongoose.Types.ObjectId(movieId),
    theater,
    showTime,
    totalSeats,
    bookedSeats,
    basePrice,
};

try {
    const show = await Show.create(showData);
    res.status(StatusCodes.CREATED).json({ show });
} catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({
    message: 'Failed to create show',
    error: error.message,
    });
}
};

const deleteShow = async (req, res) => {
    const { id: showId } = req.params; // Extract showId from url parameters
  
    // Check if showId is a valid objectId
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
  
    try {
      // Delete the show
      await Show.deleteOne({ _id: showId });
  
      res.status(StatusCodes.OK).json({ message: 'Show deleted successfully' });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Failed to delete show',
        error: error.message,
      });
    }
  }


const updateShow = async (req, res) => {
  const Id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(Id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Invalid Show ID',
    });
  }

  try {
    const show = await Show.findById(Id);
    if (!show) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Show not found',
      });
    }
    
    const allowedUpdates = ['theater', 'showTime', 'totalSeats', 'bookedSeats', 'basePrice'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update)); // Returns true or false

    if (!isValidOperation) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid update fields!',
      });
    }

    updates.forEach(update => (show[update] = req.body[update]));

    if (show.totalSeats < show.bookedSeats) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Total seats cannot be less than booked seats',
      });
    }

    const updatedShow = await show.save();

    // Send response first
    res.status(StatusCodes.OK).json({ show: updatedShow });

    // Email notification 
    const populatedShow = await Show.findById(updatedShow._id)
      .populate('movieId', 'title');

    if (populatedShow.attendees.length > 0) {
      const attendees = await User.find(
        { _id: { $in: populatedShow.attendees } },
        'name email'
      );

      await Promise.all(attendees.map(async (user) => {
        await sendUpdatesEmail({
          name: user.name,
          email: user.email,
          eventTitle: populatedShow.movieId.title,
          theater: populatedShow.theater,
          showTime: populatedShow.showTime
        });
      }));
    }

  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Failed to update show',
      error: error.message,
    });
  }
};
module.exports = {
getAllShows,
addShow,
deleteShow,
updateShow
};