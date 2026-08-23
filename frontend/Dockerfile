FROM node:24-alpine

WORKDIR /workspace

RUN corepack enable

COPY . .

RUN pnpm install

EXPOSE 3000

CMD ["pnpm", "--filter", "@gibyeol/frontend", "exec", "next", "dev", "--hostname", "0.0.0.0"]
