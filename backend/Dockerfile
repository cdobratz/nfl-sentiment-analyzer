FROM node:20-slim

WORKDIR /app

# Install dependencies including devDependencies for build
COPY package*.json ./
RUN npm ci --include=dev

# Copy all source files
COPY . .

# Build the application
RUN npm run build

# Clean up devDependencies
RUN npm ci --omit=dev

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
