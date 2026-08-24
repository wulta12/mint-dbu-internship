# MinT Online Training Management System

Professional full-stack training management system for the Ministry of Innovation and Technology (MinT), Ethiopia.

## Technology
- Frontend: React.js, Tailwind CSS, Axios, React Router
- Backend: Node.js, Express.js
- Database: PostgreSQL
- Authentication: JWT + bcrypt

## Project Structure
```text
mint-training-system-v2/
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       │   ├── admin/
│       │   ├── trainer/
│       │   └── trainee/
│       ├── services/
│       ├── images/
│       ├── App.js
│       └── index.js
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── validators/
│       └── server.js
├── database/
│   └── schema.sql
└── README.md
```

## Setup
1. Create a PostgreSQL database.
2. Run `database/schema.sql`.
3. Copy `backend/.env.example` to `backend/.env` and configure PostgreSQL/JWT settings.
4. Run `npm install` inside `backend` and `frontend`.
5. Start backend with `npm run dev`.
6. Start frontend with `npm start`.

## Security
`.env` files and `node_modules` are intentionally excluded from the distributable project.
