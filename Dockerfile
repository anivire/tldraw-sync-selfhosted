# Use a Node.js base image
FROM node:22.19.0

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port your application runs on
EXPOSE 5173

# Define the command to run your application
CMD ["npm", "run", "dev"]
