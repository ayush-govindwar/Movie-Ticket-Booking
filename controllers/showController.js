const Show = require('../models/Show')
const Movie = require('../models/Movies')
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')


const getAllShows = async (req, res) => {
    try {
      // Fetch all shows from the database
      const shows = await Show.find({});
  
      // Group shows by movieId
      const showsByMovieId = shows.reduce((acc, show) => {
        const movieId = show.movieId.toString(); // Convert ObjectId to string
        if (!acc[movieId]) {
          acc[movieId] = [];
        }
        acc[movieId].push(show);
        return acc;
      }, {});
  
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
    const { id: showId } = req.params; // Extract showId from URL parameters
  
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
  };


const updateShow = async (req, res) => {
  const Id = req.params.id;

  // Validate Show ID format
  if (!mongoose.Types.ObjectId.isValid(Id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Invalid Show ID',
    });
  }

  try {
    // Find and validate the show exists
    const show = await Show.findById(Id);
    if (!show) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Show not found',
      });
    }

    // Define allowed fields and validate updates
    const allowedUpdates = ['theater', 'showTime', 'totalSeats', 'bookedSeats', 'basePrice'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid update fields!',
      });
    }

    // Apply updates
    updates.forEach(update => (show[update] = req.body[update]));

    // Validate seat numbers
    if (show.totalSeats < show.bookedSeats) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Total seats cannot be less than booked seats',
      });
    }

    // Save and return updated show
    const updatedShow = await show.save();
    res.status(StatusCodes.OK).json({ show: updatedShow });

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