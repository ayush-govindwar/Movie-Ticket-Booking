require('dotenv').config();
//express
const express = require("express");
const app = express();

//rest ot packages
const cors = require('cors');

//database
const connectDB = require('./db/connect');

//router
const authRouter = require('./router/authRoutes');

//middleware
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');


app.use(express.json());
app.use(cors());
app.use(express.json());




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