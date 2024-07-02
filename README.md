
## Create .env and update values
```
cat env.example > .env
```
Install deps
```
pnpm install --frozen-lockfile
```

Run docker-compose
```
docker compose up -d --build
```
