const express = require("express");
const router = express.Router();
const Show = require("../models/Show");
const {authorizePermissions , authenticateUser,} = require('../middleware/authentication')
const {
    addShow,
    getAllShows,
    deleteShow,
    updateShow
} = require("../controllers/showController")


router.post('/addShow/:Id',authenticateUser, authorizePermissions('admin'),addShow)
router.get('/getAllShows',authenticateUser,getAllShows)
router.delete('/deleteShow/:id',authenticateUser, authorizePermissions('admin'),deleteShow)
router.put('/updateShow/:id', authenticateUser, authorizePermissions('admin'), updateShow);

module.exports = router