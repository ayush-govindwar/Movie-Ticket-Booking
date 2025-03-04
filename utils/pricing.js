function calculateDynamicPrice({
    basePrice,
    bookedSeats,
    seatsBooked,
    totalSeats,
    showTime,
    bookingTime,
  }) {
    let pricePerSeat = basePrice;
  
    // Peak hours (7 PM - 10 PM) check
    const showDate = new Date(showTime);
    const showHour = showDate.getHours();
    if (showHour >= 19 && showHour < 22) {
      pricePerSeat *= 1.2;
    }
  
    // Demand-based pricing
    const newBookedSeats = bookedSeats + seatsBooked;
    const bookedPercentage = (newBookedSeats / totalSeats) * 100;
    if (bookedPercentage >= 70) {
      pricePerSeat *= 1.3;
    } else if (bookedPercentage < 30) {
      pricePerSeat *= 0.9;
    }
  
    // Time-based pricing (within 3 hours)
    const timeDiff = showDate - new Date(bookingTime);
    const threeHoursMs = 3 * 60 * 60 * 1000;
    if (timeDiff <= threeHoursMs && timeDiff > 0) {
      pricePerSeat *= 1.2;
    }
  
    return pricePerSeat;
  }
  
  module.exports = { calculateDynamicPrice };