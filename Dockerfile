# Use Node.js 20 LTS image to match the application runtime requirement.
FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies deterministically.
RUN npm ci --ignore-scripts
RUN npm ci --prefix backend
RUN npm ci --prefix frontend

# Copy all files
COPY . .

# Build the Next.js frontend
RUN cd frontend && npm run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the unified server
CMD ["node", "server.js"]
