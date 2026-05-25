FROM golang:1.20-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go env -w GOPROXY=https://proxy.golang.org
RUN go mod download
COPY . .
RUN go build -o /worker ./main.go

FROM alpine:3.18
RUN apk add --no-cache ca-certificates
COPY --from=build /worker /worker
ENV CHILD_AGE=12
EXPOSE 8080
ENTRYPOINT ["/worker"]
