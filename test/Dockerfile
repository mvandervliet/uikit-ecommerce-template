FROM node:10-alpine
EXPOSE 3000

RUN apk update && apk add --no-cache \
    autoconf \
    automake \
    bash \
    g++ \
    libc6-compat \
    libjpeg-turbo-dev \
    libpng-dev \
    make \
    nasm

RUN npm install -g gulp
# RUN npm install -g puppeteer

WORKDIR /usr/src/app
