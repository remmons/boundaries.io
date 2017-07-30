FROM golang:1.8

WORKDIR /go/src/github.com/jbielick/boundaries.io

RUN go get -u github.com/kardianos/govendor

# COPY ./vendor ./vendor

# RUN govendor sync

COPY . .

RUN go get ./...

EXPOSE 3001

CMD go run main.go
