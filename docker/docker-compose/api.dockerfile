FROM python:3.8.5-alpine

# Set environment variables
ENV PYTHONUNBUFFERED 1

WORKDIR /usr/src/app

COPY api/requirements.txt .

# Install dependencies.
RUN pip install --upgrade pip
RUN pip install -r requirements.txt \
    pip install gunicorn

RUN addgroup -S webuser && adduser -S webuser -G webuser

# Copy project code.
COPY api/ .

ENV LOGFOLDER="/usr/src/app/log"
RUN mkdir -p $LOGFOLDER && touch "$LOGFOLDER/access.log" && touch "$LOGFOLDER/error.log"

# chown all the files to the app user
RUN chown -R webuser:webuser .

# change to the webuser user
USER webuser

# Start the server when the image is launched
CMD gunicorn 'main:create_app()' --bind 0.0.0.0:8000 --access-logfile "$LOGFOLDER/access.log" --error-logfile "$LOGFOLDER/error.log"