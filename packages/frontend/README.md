## Environment Setup

### Using Doppler (Recommended)
This project uses Doppler to manage environment variables. To run the app with Doppler:
```bash
doppler run -- pnpm dev
```

### Manual Setup
Alternatively, create a `.env` file and update values:
```bash
cp env.example .env
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
