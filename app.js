require('dotenv').config();
//express
const express = require("express");
const app = express();

//rest of the packages
const cors = require('cors');
const cookieParser = require("cookie-parser");

//database
const connectDB = require('./db/connect');

//router
const authRouter = require('./routes/authRoutes');
const showRouter = require('./routes/showRoutes');
const movieRouter = require('./routes/movieRoutes');
const bookingRouter = require('./routes/bookingRoutes')
const paymentRouter = require('./routes/paymentRoutes')
//middleware
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

//testing




app.use(express.json());
app.use(cors());
app.use(cookieParser(process.env.JWT_SECRET));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/show', showRouter);
app.use('/api/v1/movie', movieRouter);
app.use('/api/v1/booking', bookingRouter)
app.use('/api/v1/payment', paymentRouter)

const port = process.env.PORT || 5000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
