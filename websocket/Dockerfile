FROM node:alpine

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install && npm install pm2@latest -g

COPY . .

EXPOSE 3000

CMD npm start