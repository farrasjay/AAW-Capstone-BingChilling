# Stage 1: Build the application
FROM node:18.18.2 AS builder

WORKDIR /service-auth

# Copy package.json and install dependencies
COPY package.json ./

RUN npm install -g pnpm typescript
RUN pnpm install

# Copy all source files
COPY . .

# Copy package.json into dist manually so it's available at runtime
RUN cp package.json dist/

# Build the app
RUN pnpm run build

# Stage 2: Create a lightweight production image
FROM node:18.18.2-slim

ENV PORT 8000
ENV NODE_ENV production

WORKDIR /service-auth

# Copy build output and the copied package.json
COPY --from=builder /service-auth/dist ./dist

# Install only production dependencies
COPY --from=builder /service-auth/package.json ./package.json
RUN npm install --only=production

# Expose port and run server
EXPOSE 8000
CMD ["node", "dist/src/server.js"]