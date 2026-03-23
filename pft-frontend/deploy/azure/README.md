# Azure Frontend Deployment

Deploy `pft-frontend` as its own Azure-hosted app.

## Build source
- Use `pft-frontend/Containerfile`
- Pass the backend URL with the `VITE_API_BASE_URL` build argument
- The final container serves static files on port `80`

## Required build argument
- `VITE_API_BASE_URL=https://<your-backend-host>`

## Azure App Service
- Deploy the built container on port `80`
- No database or JWT secrets are needed in the frontend app

## Azure Static Web Apps
- Build with the same `VITE_API_BASE_URL`
- Publish the `dist/` output if you are not deploying the container image

## Validation
- Frontend: `https://<your-frontend-host>/`
- Browser API calls should target `https://<your-backend-host>/api/...`
