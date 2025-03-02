const Movie = require('../models/Movies')
const Show = require('../models/Show')
const mongoose = require('mongoose')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')

const getAllmovies = async (req, res) => {
    const movies = await Movie.find()
    res.status(StatusCodes.OK).json({ movies, count: movies.length })
  }

const addmovie = async (req, res) => {
const { title, genre, duration, releaseDate} = req.body;

const movieData = {
title,
genre,
duration,
releaseDate
};

try {
    const movie = await Movie.create(movieData);
    res.status(StatusCodes.CREATED).json({ movie });
} catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({
    message: 'Failed to create movie',
    error: error.message,
    });
}
};

const deleteMovie = async (req, res) => {
    const { id: movieId } = req.params; // 
  
    // Check if movieId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Invalid Movie ID',
      });
    }
  
    // Check if the movie exists
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Movie not found',
      });
    }
  
    try {
      // Delete the movie
      await Movie.deleteOne({ _id: movieId });
  
      // Delete all shows associated with the movie
      await Show.deleteMany({ movieId });
  
      res.status(StatusCodes.OK).json({ message: 'Movie and associated shows deleted successfully' });
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Failed to delete movie',
        error: error.message,
      });
    }
  };
module.exports = {
getAllmovies,
addmovie,
deleteMovie
  };