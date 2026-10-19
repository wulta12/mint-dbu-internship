# Render Full-Stack Deployment Configuration
# Mint Training System - Two separate Render services

## Service 1: Frontend (React)
# 1. Create new Service in Render dashboard
# 2. Set Repository: your-repo
# 3. Set Root Directory: mint-training-system-v2/frontend
# 4. Build Command: npm run build
# 5. Start Command: npx serve -s build -l 5000
# 6. Add Environment Variables:
#    REACT_APP_API_URL: https://mint-training-backend.onrender.com/api
#    NODE_ENV: production

## Service 2: Backend (Node.js/Express)
# 1. Create new Service in Render dashboard  
# 2. Set Repository: your-repo
# 3. Set Root Directory: mint-training-system-v2/backend
# 4. Build Command: npm install
# 5. Start Command: npm run dev
# 6. Add Environment Variables:
#    PORT: 5000
#    NODE_ENV: production
#    ALLOWED_ORIGINS: http://localhost:3000,https://mint-frontend.vercel.app
#    DATABASE_HOST: ep-xxxx-neon.tech
#    DATABASE_NAME: your-db-name
#    DATABASE_USER: neon_owner
#    DATABASE_PASSWORD: your-password
#    JWT_SECRET: super-secret-key
#    CORS_ORIGIN: https://mint-frontend.vercel.app

# Workflow:
# 1. Deploy backend first (Service 2)
# 2. Set REACT_APP_API_URL in frontend to the backend URL
# 3. Deploy frontend (Service 1)
# 4. Users can access at: https://mint-frontend.vercel.app

# Note: Render automatically provides https URLs.
# Use https://your-backend.onrender.com/api as the API base.