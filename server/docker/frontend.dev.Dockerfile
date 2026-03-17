FROM node:22-bookworm-slim
RUN npm install -g pnpm
WORKDIR /app
EXPOSE 5173
CMD ["sh", "-c", "pnpm install && cd frontend/packages/inspector && npx vite --host 0.0.0.0"]
