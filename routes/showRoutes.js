const express = require("express");
const router = express.Router();
const Show = require("../models/Show");
const {authorizePermissions , authenticateUser,} = require('../middleware/authentication')
const {
    addShow,
    getAllShows,
    deleteShow
} = require("../controllers/showController")


router.post('/addShow',authenticateUser, authorizePermissions('admin'),addShow)
router.get('/getAllShows',authenticateUser,getAllShows)
router.delete('/deleteShow/id:',authenticateUser, authorizePermissions('admin'),deleteShow)

module.exports = router