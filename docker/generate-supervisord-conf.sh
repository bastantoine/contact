#!/bin/sh

# supervisord config for gunicorn and Nginx
# From https://github.com/tiangolo/uwsgi-nginx-docker/blob/master/docker-images/supervisord-alpine.ini

content=""
content=$content"[supervisord]\n"
content=$content"nodaemon=true\n"
content=$content"\n"
content=$content"[program:gunicorn]\n"
content=$content"command=$(which gunicorn) --bind 0.0.0.0:${GUNICORN_PORT} main:create_app()\n"
content=$content"directory=${API_DIR}\n"
content=$content"stdout_logfile=${API_LOG_DIR}/${ACCESS_LOG_FILE}\n"
content=$content"stdout_logfile_maxbytes=0\n"
content=$content"stderr_logfile=${API_LOG_DIR}/${ERROR_LOG_FILE}\n"
content=$content"stderr_logfile_maxbytes=0\n"
content=$content"\n"
content=$content"[program:nginx]\n"
content=$content"command=$(which nginx)\n"
content=$content"stdout_logfile=${FRONT_LOG_DIR}/${ACCESS_LOG_FILE}\n"
content=$content"stdout_logfile_maxbytes=0\n"
content=$content"stderr_logfile=${FRONT_LOG_DIR}/${ERROR_LOG_FILE}\n"
content=$content"stderr_logfile_maxbytes=0\n"
content=$content"# Graceful stop, see http://nginx.org/en/docs/control.html\n"
content=$content"stopsignal=QUIT\n"

# Make sure the directory exists
mkdir -p /etc/supervisor.d

printf "$content" > /etc/supervisor.d/supervisord.ini
