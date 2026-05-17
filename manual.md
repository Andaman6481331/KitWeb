# Installation & Usage Manual

This guide provides instructions on how to set up the KitWeb project locally, run it for development, and build it for production.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Recommended: Latest LTS version)
- npm (Usually bundled with Node.js)

## Setting Up the Project

1. **Clone the repository**:
   ```sh
   git clone https://github.com/Andaman6481331/KitWeb.git
   cd KitWeb
   ```

2. **Navigate to the frontend directory**:
   ```sh
   cd frontend/kitweb
   ```

3. **Install dependencies**:
   ```sh
   npm install
   ```

## Running for Development

To start the development server with Hot Module Replacement (HMR):

```sh
npm run dev
```

The application will typically be available at `http://localhost:5173`.

## Building for Production

To create a production-ready bundle in the `dist` directory:

```sh
npm run build
```

The build will be optimized and minified for deployment.

### Previewing the Build
To preview the production build locally:

```sh
npm run preview
```

## Cloudflare Backend & Admin
The project uses Cloudflare Workers, D1 (Database), and R2 (Storage).

### Setting the Admin Password (Live)
To set or change the admin password for your live website, run this command in the `hidden-water-ed9d` folder:

```sh
npx wrangler secret put ADMIN_PASSWORD
```

### Running Backend Locally
To start the backend worker:

```sh
cd hidden-water-ed9d
npm run dev
```

## Deployment

The project is deployed using **Cloudflare** (Pages for frontend and Workers for backend).

### Frontend (Cloudflare Pages)
- **Primary Domain**: [kitcharoensampeng.com](https://kitcharoensampeng.com)
- **Cloudflare Project**: `kitweb`
- **Deployment Folder**: `frontend/kitweb`
- **Workflow**:
  ```sh
  cd frontend/kitweb
  npm run build
  npx wrangler pages deploy dist
  ```

### Backend (Cloudflare Workers)
- **Cloudflare Project**: `hidden-water-ed9d`
- **Deployment Folder**: `hidden-water-ed9d`
- **Workflow**:
  ```sh
  cd hidden-water-ed9d
  npx wrangler deploy
  ```

## Troubleshooting
- **Node Version**: If you encounter issues with package installation, ensure your Node.js version is up to date.
- **Port Conflicts**: If port `5173` is in use, Vite will automatically try the next available port.
- **Wrangler Login**: If deployment fails, ensure you are logged into Cloudflare via `npx wrangler login`.

