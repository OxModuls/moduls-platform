# Moduls Backend

A Node.js/Express backend for the Moduls platform.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Create a `.env` file with the following variables:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/moduls

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Server Configuration
PORT=8000
NODE_ENV=development
```

3. Start the server:
```bash
bun run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/wallet-login` - Authenticate with wallet signature
- `GET /api/auth/user` - Get authenticated user data

### Agents
- `GET /api/agents/mine` - Get user's agents
- `POST /api/agents/create` - Create a new agent (with file upload)

### Stats
- `GET /api/stats` - Get platform statistics

## File Upload

The backend uses Cloudinary for file uploads. Images are:
- Limited to 5MB
- Supported formats: JPG, PNG, GIF
- Automatically resized to 500x500px
- Stored in the 'moduls-agents' folder
