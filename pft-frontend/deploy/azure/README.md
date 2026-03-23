# Azure Frontend Deployment

Deploy `pft-frontend` as its own Azure-hosted app.

## Build source
- Use `pft-frontend/Containerfile`
- Pass the backend URL with the `VITE_API_BASE_URL` build argument
- The final container serves static files on port `80`

## Required build argument
- `VITE_API_BASE_URL=https://pocket-finance-backend-avbcd9aqg5addmdq.centralindia-01.azurewebsites.net`

## Azure App Service
- Option A (recommended for App Service): deploy the static build output (`dist/`) using GitHub Actions workflow `.github/workflows/main_pocket-finance-frontend.yml`
- Set a GitHub repo variable `VITE_API_BASE_URL` to `https://pocket-finance-backend-avbcd9aqg5addmdq.centralindia-01.azurewebsites.net` (optional; workflow already has this as a default)
- Configure the App Service startup command to serve SPA static files from `wwwroot` (example): `pm2 serve /home/site/wwwroot --no-daemon --spa`
- Option B: deploy the built container on port `80` (requires App Service for Containers)
- No database or JWT secrets are needed in the frontend app (only the backend URL at build time)

## Azure Static Web Apps
- Build with the same `VITE_API_BASE_URL`
- Publish the `dist/` output if you are not deploying the container image

## Validation
- Frontend: `https://<your-frontend-host>/`
- Browser API calls should target `https://<your-backend-host>/api/...`
