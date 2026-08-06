FROM node:26-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm link

EXPOSE 3000

# Runs setup, then hands execution off to quart with any extra arguments!
ENTRYPOINT ["sh", "-c", "npm run setup && exec quart \"$@\"", "--"]

# Default argument (web mode)
CMD []
