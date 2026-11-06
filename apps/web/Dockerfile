# Multi-stage hardened static build for Thenar Companion Web App
FROM node:22.14.0-alpine3.21 AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY src/ ./src/
COPY index.html vite.config.ts tailwind.config.js postcss.config.js ./

RUN npm ci
RUN npm run build

FROM nginx:1.27.4-alpine3.21-slim AS runner

# Drop default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Security headers & SPA routing configuration
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    add_header X-Frame-Options "DENY" always;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/thenar.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
