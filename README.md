# 🚀 IndusConnect B2B Marketplace

IndusConnect is a full-stack, responsive B2B platform connecting startups, manufacturers, suppliers, and traders in a secure, unified network. It provides custom catalog features, RFQ (Request for Quote) management, shopping cart operations, complaints panels, and role-based user dashboards (buyer, supplier, administrator).

---

## 🛠️ Technology Stack
*   **Frontend:** React (Vite, React Router HashRouter, Lucide Icons, Vanilla CSS Design System)
*   **Backend:** Node.js (Express API server, JWT Authentication, CORS enabled)
*   **Database:** SQLite (local binary file, auto-generated schema, and self-seeding sample database)

---

## ⚡ Deployment & Hosting (Globally Live)

You can host both the frontend and the database server **together as a unified service**. This simplifies CORS setup and keeps the database connected out-of-the-box.

### Option A: Deploy to Railway (Recommended)

Nixpacks will build the React app and start the database server automatically.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/new/template?template=https://github.com/osama-2004/indo)

1. Click the **Deploy on Railway** button above.
2. Link your GitHub repository.
3. In variables, define a `JWT_SECRET` (e.g. `my-secure-key`).
4. Click **Deploy**. Your app will be live globally!

### Option B: Deploy to Render

Render will read the `render.yaml` blueprint and deploy the unified app instantly.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/osama-2004/indo)

1. Click the **Deploy to Render** button above.
2. Render will automatically parse the blueprint settings.
3. Provide a name and launch the service.

---

## 💻 Local Development Setup

To run both frontend and backend concurrently locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/osama-2004/indo.git
   cd indo
   ```
2. Install root and server dependencies:
   ```bash
   npm install
   cd server && npm install
   cd ..
   ```
3. Run the development server (runs both frontend at `5173` and backend at `5000` concurrently):
   ```bash
   npm run dev:full
   ```

