FROM docker.io/library/node:26.13.0-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM docker.io/library/golang:1.27.3-alpine3.24 AS imgproxy
WORKDIR /src
COPY imgproxy/go.mod imgproxy/main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /imgproxy .

FROM docker.io/library/caddy:2.11.7-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
COPY --from=imgproxy /imgproxy /usr/local/bin/imgproxy
COPY --chmod=755 imgproxy/start.sh /usr/local/bin/start.sh
CMD ["/usr/local/bin/start.sh"]
