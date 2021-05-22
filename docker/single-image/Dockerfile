# Dockerfile built to host and serve a python app and a node  app via Nginx in
# the same container using supervisord to orchestrate everything Largely
# inspired (or copied...?) from
# https://github.com/tiangolo/uwsgi-nginx-docker/tree/master/docker-images

#####################
#  Build the front  #
#####################
FROM node:12.19.0-alpine3.10 as front-builder

# Install node modules first, without copying all files
# This allow to cache the install step
COPY front/package.json /tmp/
RUN cd /tmp && npm install

WORKDIR /usr/src/app
RUN cp -a /tmp/node_modules .
COPY ./front/ .
# Make sure the front is configured with the right value
# That's a ugly hack, but it works for now until we find a nicer way
ARG hostname="http://localhost:1337"

RUN echo "export const API_ENDPOINT = '${hostname}/api'" > src/config.ts
RUN npm run build

#####################
#     Main image    #
#####################
FROM python:3.8-alpine3.13

#####################
#      ENV vars     #
#####################
ENV WORKDIR /usr/src/app

ENV API_DIR "${WORKDIR}/api"
ENV FRONT_DIR "${WORKDIR}/front"

ENV API_LOG_DIR "${API_DIR}/log"
ENV FRONT_LOG_DIR "${FRONT_DIR}/log"

ENV ACCESS_LOG_FILE "access.log"
ENV ERROR_LOG_FILE "error.log"

ENV GUNICORN_PORT 5000

EXPOSE 80
EXPOSE 443

RUN mkdir -p ${API_LOG_DIR}
RUN mkdir -p ${FRONT_LOG_DIR}

# Create the files if needed
RUN touch "${API_LOG_DIR}/${ACCESS_LOG_FILE}"
RUN touch "${API_LOG_DIR}/${ERROR_LOG_FILE}"
RUN touch "${FRONT_LOG_DIR}/${ACCESS_LOG_FILE}"
RUN touch "${FRONT_LOG_DIR}/${ERROR_LOG_FILE}"

WORKDIR ${WORKDIR}

#####################
#     API stuff     #
#####################
ENV PYTHONUNBUFFERED 1

COPY api/ ./api

RUN pip install -r ./api/requirements.txt \
    pip install gunicorn

#####################
#    Front stuff    #
#####################
COPY docker/single-image/install-nginx-alpine.sh /
RUN sh /install-nginx-alpine.sh

RUN rm /etc/nginx/conf.d/default.conf
COPY docker/single-image/nginx.conf /etc/nginx/conf.d
# Disable deamon mode for nginx. Needed to run fine with supervisord
# From https://serverfault.com/a/647398
RUN echo -e "\ndaemon off;\n" >> /etc/nginx/nginx.conf

COPY --from=front-builder /usr/src/app/build/ ./front

#####################
# Supervisord stuff #
#####################
RUN apk add --no-cache supervisor

COPY docker/single-image/generate-supervisord-conf.sh .
RUN chmod +x generate-supervisord-conf.sh
# Generate the supervisord conf file. Must be run after installing gunicorn and
# nginx, as we need to set the paths to both bins in the config file
RUN ${WORKDIR}/generate-supervisord-conf.sh

#####################
#   Run the image   #
#####################
CMD /usr/bin/supervisord -c /etc/supervisor.d/supervisord.ini
