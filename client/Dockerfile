# Stage 1: Build static production assets
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# Stage 2: Serve static production assets with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration for SPA routing fallback and Express reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static distribution from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
