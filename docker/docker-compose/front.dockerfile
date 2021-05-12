FROM node:12.19.0-alpine3.10 as node-builder

# Install node modules first, without copying all files
# This allow to cache the install step
COPY front/package.json /tmp/
RUN cd /tmp && npm install

WORKDIR /usr/src/app
RUN cp -a /tmp/node_modules .
COPY front/ .

# Setting specific to a build using docker-compose
RUN echo "export const API_ENDPOINT = 'api:5000/api'" > src/config.ts
RUN npm run build

FROM nginx:1.19.0-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY docker/docker-compose/nginx.conf /etc/nginx/conf.d
COPY --from=node-builder /usr/src/app/build /usr/src/app/