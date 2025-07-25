# Moduls

A full-stack JavaScript web application for deploying and managing on-chain agents (Moduls) with their own logic, tokens, and UI. The project uses React (with Vite) for the frontend and Node.js (Express) for the backend. All TypeScript has been removed; the codebase is now 100% JavaScript/JSX.

---

## Features
- **Frontend:** React (JSX), Vite, Tailwind CSS, Radix UI, Wagmi (Web3), Sonner (toasts), Vaul (drawer)
- **Backend:** Node.js, Express, Mongoose (MongoDB)
- **Blockchain:** Wagmi, Viem, ERC20 ABI, MetaMask/Trust Wallet integration
- **Utilities:** Modern React hooks, utility functions, and reusable UI components
- **No TypeScript:** All code is JavaScript/JSX for maximum compatibility

---

## Project Structure

```
moduls/
  backend/           # Express backend (Node.js)
    core/            # Core logic, models, middlewares
    routes/          # API routes
    app.js           # Main backend entry point
    package.json     # Backend dependencies
  frontend/          # React frontend (Vite)
    src/
      components/    # React components (JSX)
      pages/         # Main app pages (JSX)
      lib/           # Utilities (utils.js)
      shared/        # Shared constants (constants.js)
      wagmi.js       # Wagmi blockchain config
      App.jsx        # Main App component
      main.jsx       # React entry point
    index.html       # Main HTML file
    package.json     # Frontend dependencies
```

---

## Prerequisites
- [Bun](https://bun.sh/) (for fast installs and scripts)
- [Node.js](https://nodejs.org/) (for backend)
- [MongoDB](https://www.mongodb.com/) (for backend database)

---

## Setup & Installation

### 1. Clone the repository
```sh
git clone <repo-url>
cd moduls
```

### 2. Install dependencies
#### Backend
```sh
cd backend
bun install
```
#### Frontend
```sh
cd ../frontend
bun install
```

### 3. Configure environment variables
- Copy `.env.example` to `.env` in the `backend/` directory and fill in your values.

### 4. Start the backend
```sh
cd backend
bun run start
```

### 5. Start the frontend
```sh
cd frontend
bun run dev
```

---

## Usage
- Visit `http://localhost:5173` to use the frontend app.
- Backend runs on `http://localhost:3000` by default.
- Deploy, manage, and interact with on-chain agents (Moduls) via the UI.

---

## Notes
- All TypeScript has been removed; the project is now JavaScript/JSX only.
- Update the ERC20 contract address in `frontend/src/shared/constants.js` as needed.
- For blockchain features, ensure you have MetaMask or a compatible wallet installed.

---

## License
MIT
