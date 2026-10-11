FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:web

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf "server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n\n  location = /index.html { add_header Cache-Control \"no-store\"; try_files \$uri =404; }\n  location / { try_files \$uri \$uri/ /index.html; }\n  location ~* \\.(?:js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?)\$ { expires 1y; add_header Cache-Control \"public, immutable\"; try_files \$uri =404; }\n}\n" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD [\"nginx\", \"-g\", \"daemon off;\"]
