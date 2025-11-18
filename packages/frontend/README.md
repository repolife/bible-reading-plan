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

Contetful content needs to be import in your space with the contentful-cli

```
contentul import -space-id "spaceid" --content-file "contentful-export-4nna"
```
