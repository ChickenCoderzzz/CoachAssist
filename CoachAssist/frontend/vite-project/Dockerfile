# --- Stage 1: Build the React Application ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies (use npm ci for reliable builds if package-lock is present)
RUN npm install

# Copy application source code
COPY . .

# Build the Vite project (outputs static files to /app/dist)
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Copy the compiled static files from the builder stage to Nginx's default serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
