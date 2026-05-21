# Optional container build. The primary deploy path is a DigitalOcean App
# Platform static site (see .do/app.yaml), which needs no Dockerfile. This is
# here for running the same static bundle anywhere that takes a container.
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:80/ || exit 1
