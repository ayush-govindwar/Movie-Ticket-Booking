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

//middleware


//testing




app.use(express.json());
app.use(cors());
app.use(cookieParser(process.env.JWT_SECRET));

app.use('/api/v1/auth', authRouter);


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
