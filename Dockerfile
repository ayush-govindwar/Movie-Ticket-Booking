# Use Node.js v22 as base image
FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# If you're building your code for production
# RUN npm ci --only=production

# Copy app source code
COPY . .

# Expose API port
EXPOSE 5001

# Command to run the application
CMD ["node", "app.js"]