FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm link

EXPOSE 3000

# Runs setup, then hands execution off to quart with any extra arguments!
ENTRYPOINT ["sh", "-c", "node setup.js && exec quart \"$@\"", "--"]

# Default argument (web mode)
CMD []