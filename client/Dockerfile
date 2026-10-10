FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Runs Vite server in network host mode
CMD ["npm", "run", "dev", "--", "--host"]
