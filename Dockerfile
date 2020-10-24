FROM node:12

WORKDIR /usr/src/app

RUN mkdir data
RUN chmod 777 data
VOLUME /data


COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=development

EXPOSE 7050

CMD [ "node", "index.js" ]