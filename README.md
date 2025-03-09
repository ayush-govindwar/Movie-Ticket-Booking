# Movie Ticket Booking API

A full-featured API for movie ticket booking with advanced reservation management, dynamic pricing, and secure payment processing.

## Features

### Authentication
- Secure User Registration with email verification
- Token-based Authentication with access and refresh tokens stored in HTTP-only cookies
- Role-based Access Control for admin and regular user operations

### Movie Management
- Movie Catalog with comprehensive details (title, genre, duration, release date)
- Admin Controls for adding, updating, and removing movies from the catalog

### Show Management
- Flexible Scheduling with customizable theaters, showtimes, and seating capacity
- Role based access 
- Admin Dashboard for managing shows (add, update, delete)
- Email Notifications to attendees when show details are modified

### Booking System
- Intelligent Seat Locking mechanism that temporarily reserves seats during payment process
- Automated Lock Release for abandoned/expired bookings (prevents ghost bookings)
- Attendee Tracking for each show

### Dynamic Pricing
- Smart Pricing Algorithm that adjusts ticket costs based on:
  - Current booking percentage
  - Time until show
  - Base ticket price
  - Number of seats being booked
- Price Simulation Tool for customers to check potential pricing before booking

### Payment Processing
- Secure Integration with Razorpay payment gateway
- Two-Layer Payment Handling:
  - Frontend redirect for user-initiated payments
  - Backend webhook processing for payment verification
- Robust Dual Payment System:
  - Primary user flow with interactive payment completion
  - Secondary server-side verification ensuring successful transactions even if users close windows before redirect
  - Thus successful transaction takes place regardless
- Session-based database operations to avoid race conditions
- Elegant Payment Pages with real-time countdown timers for locked seats

## Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB
- Docker (optional but recommended)
- Razorpay account for payment processing

### Environment Variables
Create a `.env` file in the root directory with the following variables:

```
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/movie-booking

# JWT
JWT_SECRET=your_jwt_secret
JWT_LIFETIME=1d

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### Installation

#### Regular Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/movie-ticket-booking.git
cd movie-ticket-booking

# Install dependencies
npm install

# Start the server
npm start
```

#### Docker Setup
```bash
# Build the Docker image
docker build -t movie-ticket-booking .

# Run the container
docker run -p 3000:3000 --env-file .env movie-ticket-booking
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user with email verification
- `POST /api/v1/auth/login` - Login with email and password

### Movies
- `POST /api/v1/movie/addMovie` - Add a new movie (admin only)
- `GET /api/v1/movie/getAllmovies` - Get all movies

### Shows
- `POST /api/v1/show/addShow/:movieId` - Add a new show for a movie (admin only)
- `GET /api/v1/show/getAllShows` - Get all shows grouped by movie
- `PUT /api/v1/show/updateShow/:showId` - Update show details (admin only)
- `DELETE /api/v1/show/deleteShow/:showId` - Delete a show (admin only)

### Booking & Payment
- `POST /api/v1/payment/create-order` - Create a booking with seat reservation
- `POST /api/v1/booking/simulate` - Simulate ticket pricing before booking
- `GET /api/v1/payment/pay/:orderId` - Payment page for completing transaction
- `GET /api/v1/payment/payment-success` - Handle successful payments
- `GET /api/v1/payment/payment-failed` - Handle failed payments

## Security Features
- Password hashing with bcrypt
- JWT for stateless authentication
- HTTP-only cookies for token storage
- MongoDB transaction support for data integrity
- Signature verification for payment webhooks
- XSS protection with xss-clean to avoid input-injection
- Security headers with Helmet
- Rate limiting to prevent DDoS attacks

## Advanced Workflows

### Booking & Payment Flow
1. User selects movie and show
2. User specifies number of seats to book
3. System locks seats for 10 minutes
4. Razorpay order is created with dynamic pricing
5. User is redirected to payment page with countdown timer
6. Upon successful payment:
   - Booking status is updated
   - Locked seats are converted to booked seats
7. If payment fails or expires:
   - Locked seats are released
   - Booking is marked as failed/expired

### Seat Locking Mechanism
- Prevents double booking during payment process
- Automatic cleanup job runs every minute to release expired locks
- Database transactions ensure data consistency

## Deployment
This API is deployed and accessible at: https://movie-ticket-booking-api-zg7q.onrender.com

## Technologies
- Express - Fast, unopinionated web framework
- MongoDB/Mongoose - Database and ODM
- JWT - Secure authentication
- bcrypt - Password hashing
- Razorpay - Payment processing
- Nodemailer - Email notifications
- Socket.io - Real-time communications
- Helmet - Secure HTTP headers
- XSS-Clean - Cross-site scripting protection
- Express-Rate-Limit - API rate limiting
- Docker - Containerization
