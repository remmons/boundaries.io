FROM mongo:3.4

WORKDIR /app

RUN apt-get update
RUN apt-get install -y curl wget build-essential gdal-bin nodejs npm

RUN npm install -G JSONStream
