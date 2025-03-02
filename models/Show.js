const mongoose = require("mongoose");

const showSchema = new mongoose.Schema({
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
  theater: { type: String, required: true },
  showTime: { type: Date, required: true },
  totalSeats: { type: Number, required: true },
  bookedSeats: { type: Number, default: 0 },
  basePrice: { type: Number, required: true },
});

module.exports = mongoose.model("Show", showSchema);
