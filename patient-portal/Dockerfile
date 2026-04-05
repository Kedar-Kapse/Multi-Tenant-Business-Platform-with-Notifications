FROM node:18-alpine AS build
WORKDIR /app
COPY patient-portal/package.json patient-portal/package-lock.json ./
RUN npm ci --legacy-peer-deps --silent
COPY patient-portal/ .
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY patient-portal/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
