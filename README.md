# 🚀 ShortLink - Full Stack URL Shortener

A production-ready, highly scalable URL Shortener application with advanced analytics, QR code generation, and a beautiful UI with Dark Mode support.

🔗 **Live Demo:** [https://url-shortener-h5v.pages.dev/](https://url-shortener-h5v.pages.dev/)
⚙️ **Backend API:** [https://o0ntksxubm3h-production-g6cns3w2.us-central1.suga.run/](https://o0ntksxubm3h-production-g6cns3w2.us-central1.suga.run/)

---

## ✨ Features

### 🔐 Core & Security
- **User Authentication:** Secure JWT-based Login & Registration.
- **Password Reset:** "Forgot Password" flow integrated with **Resend** email API.
- **Custom Aliases:** Create personalized short links (e.g., `short.url/my-link`).
- **Link Management:** Enable/Disable links without deleting them, or permanently delete them.
- **Multiple Shortening Methods:** Random, Sequential, and Hash-based code generation.

### 📊 Advanced Analytics
- **Real-time Tracking:** Track every click with IP address, device, browser, and OS detection.
- **Geolocation:** Tracks the country and region of the visitor based on IP.
- **Visual Charts:** Interactive bar charts for daily clicks and hourly distribution.
- **Data Export:** Export analytics data to CSV directly from the dashboard.

### 📱 Extra Utilities
- **QR Code Generator:** Generate customizable QR codes (color & size) for any short URL and download them as PNG or SVG.
- **Dark Mode:** Seamless light/dark theme toggling with persistent local storage.
- **Responsive Design:** Fully optimized for desktop, tablet, and mobile devices.

---

## 🛠️ Tech Stack

**Frontend:**
- React (TypeScript) + Vite
- Tailwind CSS v4 (for styling & Dark Mode)
- TanStack Query (React Query)
- React Hook Form + Zod (Validation)
- Lucide React (Icons)

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JSON Web Tokens (JWT)
- Resend (Email Service)
- Redis (Optional caching, falls back to in-memory)

**Deployment:**
- **Frontend:** Cloudflare Pages
- **Backend:** Suga (Docker Container)
- **Database:** MongoDB Atlas

---

## 📁 Project Structure

This project is a **Monorepo** containing both frontend and backend.

```text
url-shortener/
├── backend/            # Express.js API server
│   ├── src/
│   │   ├── config/     # DB, Redis, Swagger configs
│   │   ├── controllers/# Route logic
│   │   ├── models/     # Mongoose schemas
│   │   ├── routes/     # API routes
│   │   └── server.js   # Entry point
│   └── package.json
│
├── frontend/           # React + Vite app
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Dashboard, Analytics, Auth pages
│   │   ├── context/    # Auth & Theme contexts
│   │   └── api/        # Axios API calls
│   └── package.json
└── README.md
