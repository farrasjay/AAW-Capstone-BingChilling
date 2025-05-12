# Stage 1: Fetching the node image and building the application
FROM node:18.18.2 AS builder

# Setting up the work directory
WORKDIR /wishlist-service

# Copying package.json separately
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm typescript

# Installing dependencies
RUN pnpm install

# Copying the rest of the application
COPY . .

# Copy package.json into dist manually so it's available at runtime
RUN cp package.json dist/

# Building our application
RUN pnpm run build

# Stage 2: Creating a lightweight image for production
FROM node:18.18.2-slim

# Declaring env
ENV PORT 8004
ENV NODE_ENV production

# Set working directory
WORKDIR /wishlist-service

# Copy built files from the previous stage
COPY --from=builder /wishlist-service/dist ./dist
COPY --from=builder /wishlist-service/package.json ./package.json

# Install production dependencies only
RUN npm install --only=production

# Expose server port
EXPOSE 8004

# Start the application
CMD ["node", "dist/src/server.js"]