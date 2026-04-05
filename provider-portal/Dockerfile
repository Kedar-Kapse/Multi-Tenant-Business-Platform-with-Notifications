FROM node:18-alpine AS build
WORKDIR /app
COPY provider-portal/package.json provider-portal/package-lock.json ./
RUN npm ci --legacy-peer-deps --silent
COPY provider-portal/ .
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY provider-portal/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
