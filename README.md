# Bible Reading Plan

A modern, full-stack application for tracking Bible reading, featuring categorized songs, calendar events, and study tools.

## 🏗 Project Architecture

This project is organized as a monorepo using **Turborepo** and **pnpm** workspaces.

| Component | Technology | Path |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Material Tailwind | `packages/frontend` |
| **Backend** | Supabase (Auth, DB, Edge Functions) | `packages/supabase` |
| **Content** | Contentful CMS (Songs & Lyrics) | External |
| **Deployment** | Netlify | `packages/netlify` |

## 🚀 Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) (Package Manager)
- [Node.js](https://nodejs.org/) (LTS recommended)
- [Docker](https://www.docker.com/) (For local Supabase testing)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/repolife/bible-reading-plan.git
    cd bible-reading-plan
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Environment Setup:**

    This project uses **Doppler** for secret management. You can also use local `.env` files for development.

    #### Using Doppler (Recommended)

    1.  **Install the Doppler CLI** if you haven't already.
    2.  **Login and setup**:
        ```bash
        doppler login
        doppler setup
        ```
    3.  **Run with Doppler**:
        ```bash
        doppler run -- pnpm dev
        ```

    #### Using Local .env

    1.  Navigate to `packages/frontend` and create your `.env` file from the example:
        ```bash
        cd packages/frontend
        cp env.example .env
        ```
    2.  Update the values in `.env` with your Contentful and Supabase credentials.

### Development

Run the development server for all packages:
```bash
pnpm dev
```

Or run only the frontend:
```bash
pnpm --filter frontend dev
```

## 🛠 Features

- **Reading Plan**: Dynamic tracking of daily reading progress.
- **Songs & Lyrics**: Integrated with Contentful to provide a categorized list of songs and lyrics.
- **Calendar**: Event management and scheduling.
- **Study Tools**: Dedicated section for deeper Bible study.
- **PWA Support**: Installable as a mobile app with offline capabilities.

## 📖 Related Documentation

- [Frontend Details](packages/frontend/README.md)
- [Repository Guidelines](AGENTS.md)
- [Supabase Configuration](packages/supabase/README.md) (if available)

---

> [!NOTE]
> This project is currently in active development. Please ensure secrets are managed via Doppler or local `.env` files and never committed to version control.
