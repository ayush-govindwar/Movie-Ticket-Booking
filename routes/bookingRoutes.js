const express = require("express");
const router = express.Router();

const {authorizePermissions , authenticateUser,authMiddleware} = require('../middleware/authentication')
const {
    getBooking,
    simulatePrice
    
} = require("../controllers/bookingController")



//router.post('/addBooking',authenticateUser, addBooking )
router.get('/getBooking',authenticateUser, getBooking)
router.post('/simulate',authenticateUser, simulatePrice);


module.exports = router