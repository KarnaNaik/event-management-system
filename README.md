# Event Management System

A comprehensive MERN stack event management system with ticket booking, QR-based check-in, payment processing, and admin panel.

## Features

### Core Features
- **Event Creation & Management**: Create and manage events with posters, venues, and ticket types
- **Ticket Booking**: Book tickets with multiple ticket type options
- **QR Code System**: Generate and scan QR codes for event check-in
- **Payment Integration**: Support for online payments and manual verification
- **User Roles**: User, Organizer, and Admin roles with appropriate permissions

### Advanced Features
- **Organizer Profiles**: Complete profile system with bio, company info, and social links
- **Event Team Management**: Add hosts, co-hosts, and speakers to events
- **Speaker Profiles**: Detailed speaker information with topics and social media
- **Admin Panel**: Comprehensive dashboard for system management
- **Payment Verification**: Admin can verify organizer payment details
- **Camera-based Check-in**: Scan QR codes using device camera

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)
- npm or yarn

### Quick Start

1. **Install Dependencies**:
   ```bash
   npm run install-all
   ```
   *This single command installs dependencies for the root, backend, and frontend projects.*

2. **Start MongoDB**:
   ```bash
   net start MongoDB
   ```

3. **Run the Application**:
   ```bash
   # From root directory
   start-servers.bat
   ```

4. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## Default Credentials

### For Production (Render/Heroku/etc.)
The first admin user is created automatically on server startup based on the environment variables you set:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Use these credentials to log in for the first time. This is the recommended method for a new deployment.

### For Local Development
If you need to make an existing local user an admin, you can run the following command in the MongoDB shell:
```javascript
db.users.updateOne({ email: "your-user-email@example.com" }, { $set: { role: "admin" } })
```
## Troubleshooting

### 404 Error on Payment Details
- Ensure backend runs on port 5001
- Check `.env` files for correct API URL (http://localhost:5001/api)
- Clear browser cache and localStorage

### Cannot Update Payment Details
- Make sure you're logged in as organizer or admin
- Check browser console for authentication errors
- Verify JWT token exists in localStorage

### Admin Panel Not Accessible
- Your user role must be "admin"
- Update role in MongoDB as shown above
- Restart the application after role change

## Usage

### For Organizers
1. Register with "Organizer" role
2. Add payment details in Payment Settings
3. Wait for admin verification
4. Create events with team members
5. Scan QR codes for check-ins

### For Admins
1. Login with admin credentials
2. Navigate to Admin Panel
3. Verify organizer payment details
4. Manage users, events, and tickets
5. Monitor system statistics

## License
MIT License

## Free Deployment (Full Stack)

You can deploy this project fully free using:
- Database: MongoDB Atlas free tier (M0)
- Backend API: Render free web service
- Frontend: Render static site (or Netlify free)

### Option A: One-Platform Free Deploy with Render

This repository includes `render.yaml` at root for Blueprint deployment.

1. Push your code to GitHub.
2. Create a free MongoDB Atlas cluster and copy the connection string.
3. In Render, choose **New +** -> **Blueprint** and select this repository.
4. Render creates:
   - `event-management-backend` (Node web service)
   - `event-management-frontend` (static site)
5. In Render dashboard, set backend environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY` (optional if not using Stripe yet)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
6. After frontend URL is generated, set backend `FRONTEND_URL` to that exact URL.
7. Set frontend `REACT_APP_API_URL` to:
   - `https://<your-backend-service>.onrender.com/api`
8. Trigger redeploy for both services.

### Option B: Render Backend + Netlify Frontend (Free)

1. Deploy backend on Render (Web Service):
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
2. Configure backend env vars:
   - `NODE_ENV=production`
   - `MONGODB_URI=<atlas-uri>`
   - `JWT_SECRET=<strong-secret>`
   - `JWT_EXPIRE=7d`
   - `JWT_COOKIE_EXPIRE=30`
   - `FRONTEND_URL=<your-netlify-url>`
3. Deploy frontend on Netlify:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `build`
   - Set env var `REACT_APP_API_URL=https://<your-render-backend>.onrender.com/api`
4. Redeploy frontend after setting env var.

### Important Notes for Free Hosting

- Render free backend sleeps after inactivity; first request may be slow.
- Local file uploads can be ephemeral on free dynos. For reliable poster storage, move uploads to Cloudinary or S3-compatible storage.
- CORS is now restricted by `FRONTEND_URL`/`FRONTEND_URLS`, so production frontend URL must be configured.
