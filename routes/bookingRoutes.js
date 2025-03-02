const express = require("express");
const router = express.Router();

const {authorizePermissions , authenticateUser,} = require('../middleware/authentication')
const {
    addBooking,
    getBooking,
    
} = require("../controllers/bookingController")


router.post('/addBooking',authenticateUser, addBooking )
router.get('/getBooking',authenticateUser, getBooking)


module.exports = router