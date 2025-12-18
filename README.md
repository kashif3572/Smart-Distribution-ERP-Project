📦 Smart Distribution ERP

A modern ERP system for distribution companies that connects directly to Google Sheets for real-time business management.

🚀 Live Demo
🔗 URL: https://smart-ditributor-solution.netlify.app

Vedio Prensentation: 
https://drive.google.com/file/d/1jF645fsdSkKBViJD1J1_i2TQ-hvRr3wD/view?usp=sharing

Demo Logins:

Admin: admin / 1234 (Full access)

Sales: BK-101 / John101 (Orders & Customers)

Rider: rider1 / 1234 (Deliveries only)

✨ Features
📊 Real-time Dashboard - Live analytics from Google Sheets

🛒 Order Management - Create & track sales orders

👥 Customer Database - Manage customer information

🚚 Delivery Tracking - Assign & monitor deliveries

📦 Inventory Management - Product catalog with vendors

🔐 Role-based Access - Admin, Sales, Rider roles

📱 Fully Responsive - Works on all screen sizes

🛠 Tech Stack
Frontend: React + Vite + Tailwind CSS

Charts: Recharts for data visualization

Backend: Node.js/Express API

Database: Google Sheets (24+ sheets)

Hosting: Netlify (Frontend) + Google Cloud Run (Backend)

📁 Project Structure
text
src/
├── pages/           # Main pages
│   ├── Dashboard.jsx  # Analytics dashboard
│   ├── Login.jsx      # Login system
│   ├── Orders.jsx     # Order management
│   └── Customers.jsx  # Customer database
├── components/      # Reusable components
│   └── Sidebar.jsx   # Navigation sidebar
└── services/
    └── sheetsAPI.js  # Google Sheets connection
⚡ Quick Start
bash
# 1. Clone & install
git clone https://github.com/kashif3572/Smart-Distribution-ERP-Project.git
cd Smart-Distribution-ERP-Project
npm install

# 2. Run locally
npm run dev
# Opens http://localhost:5173

# 3. Build for production
npm run build
🔌 API Connection
The app connects to:

Backend API: https://sheets-api-545260361851.us-central1.run.app

Google Sheets: 24+ synchronized sheets

Auto-refresh: Every 5 minutes

🚀 Deployment
Auto-deploy: Push to main branch → Netlify builds in 2 min

Manual deploy: npm run build → Upload dist/ folder

📞 Support
Issues: GitHub Issues

Email: Kashifbilalkashi786@gmail.com

Team: Kashif Bilal & Team 38 (Innovation Batch 2025)

✅ Status: Production Ready
📅 Last Updated: December 2025
⭐ Star us on GitHub if you like it!
