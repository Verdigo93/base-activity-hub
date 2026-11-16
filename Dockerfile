FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV PORT=4173
EXPOSE 4173
USER node
CMD ["node", "api/server.mjs"]
