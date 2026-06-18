## Development

### Prerequisites
* **Node.js** (v18+)
* **npm**
* **micromamba** (or conda/uv)
* **Vercel CLI** (`npm install -g vercel`)

### Local Environment Setup

1. **Backend Environment**:
   ```bash
   micromamba env create -f env.yml
   micromamba activate rinkuji
   ```

2. **Frontend Configuration**:
   Ensure `frontend/src/js/api-config.js` is set to local mode:
   ```javascript
   export const VERCEL_URL = '';
   ```

### Running the Application Locally

#### 1. Full Stack (Flask Backend + Static Frontend)
This mimics the original development workflow. Flask serves both the API and the static files.
```bash
export FLASK_APP=backend/app.py
flask run --debug
```
Access at `http://127.0.0.1:5000`.

#### 2. Static Frontend Only (connecting to Production Vercel)
Useful for testing frontend-only changes without a local Python environment.
```bash
# Update api-config.js with your production Vercel URL
# export const VERCEL_URL = 'https://your-app.vercel.app';

python3 -m http.server 8000
```
Access at `http://localhost:8000`.

### Running Tests

#### Frontend Tests (Jest)
```bash
cd frontend
npm test
```

#### Backend Tests (Pytest)
```bash
cd backend
pytest
```

### Deployment

#### Deploy Backend to Vercel
```bash
# First time setup
vercel

# Subsequent production updates
vercel --prod
```

#### Deploy Frontend to GitHub Pages
Changes pushed to the `main` branch are automatically deployed via GitHub Actions/Pages. Ensure `index.html` uses relative paths for all assets.

### Accessing Locally Hosted App from Mobile Devices

To test on a mobile device, run Flask listening on all interfaces:
```bash
export FLASK_APP=backend/app.py
flask run --debug --host=0.0.0.0
```
Access via `http://<YOUR_PC_IP_ADDRESS>:5000`.
