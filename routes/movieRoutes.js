const express = require("express");
const router = express.Router();
const movie = require("../models/Movies");
const {authorizePermissions , authenticateUser,} = require('../middleware/authentication')
const {
    addmovie,
    getAllmovies,
    deleteMovie
} = require("../controllers/movieController")


router.post('/addmovie',authenticateUser, authorizePermissions('admin'),addmovie)
router.get('/getAllmovies',authenticateUser,getAllmovies)
router.delete('/deletemovie/:id',authenticateUser, authorizePermissions('admin'),deleteMovie)

module.exports = router