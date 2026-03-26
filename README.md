# Homecoming 2026 | 回家吃饭 🏠

> 20th Anniversary Alumni Reunion - Chong Hwa Independent High School

**Event Date:** October 10, 2026 (Saturday)  
**Venue:** Hall of Chong Hwa Independent High School, Jalan Ipoh, KL

## 🎯 Event Overview

- **Event Name:** Homecoming (回家吃饭)
- **Theme:** 从零到一，始终如一 | From Zero to One, Always Consistent
- **Target Audience:** 2006 Graduating Class & 2001 Intake Alumni

## ✨ Features

- 📅 Countdown timer to event date
- 📝 Online registration with ticket selection
- 💰 Fundraising progress tracking
- 👥 Organizing committee showcase
- 📸 Photo gallery
- 🔍 Searchable alumni directory
- 🔐 Admin panel for managing registrations

## 🚀 Quick Start (Windows)

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)

### Installation

1. **Open Command Prompt or PowerShell**

2. **Navigate to the project directory**
   ```cmd
   cd C:\Users\000\.openclaw\workspace\homecoming-2026
   ```

3. **Install dependencies**
   ```cmd
   npm install
   ```
   This will install:
   - express (web server)
   - better-sqlite3 (SQLite database)
   - express-session (session management)

4. **Start the server**
   ```cmd
   npm start
   ```
   Or directly:
   ```cmd
   node server.js
   ```

5. **Access the application**
   - Main site: http://localhost:3000
   - Admin panel: http://localhost:3000/admin

### Default Admin Credentials

- **Username:** admin
- **Password:** homecoming2026

## 📁 Project Structure

```
homecoming-2026/
├── server.js           # Express server + API routes
├── database.js         # SQLite setup + queries
├── package.json        # Dependencies
├── homecoming.db       # SQLite database (auto-created)
├── public/
│   ├── index.html      # Main SPA
│   ├── css/
│   │   └── style.css   # Styles
│   └── js/
│       └── app.js      # Frontend JavaScript
├── data/
│   └── alumni.json     # Sample alumni data
└── README.md
```

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alumni` | Get alumni list (supports `?search=` and `?year=` filters) |
| POST | `/api/register` | Submit registration |
| GET | `/api/registrations` | List all registrations (admin only) |
| GET | `/api/stats` | Get registration statistics (admin only) |
| POST | `/api/admin/login` | Admin login |
| POST | `/api/admin/logout` | Admin logout |
| GET | `/api/admin/export` | Export registrations to CSV (admin only) |

## 📝 Registration Form Fields

- Name (姓名)
- Email (电子邮箱)
- Phone (电话号码)
- Intake Year (入学年份) - 2001 intake or 2006 graduating
- Number of Attendees (参加人数)
- Meal Preference (餐饮偏好)

## 🎟️ Ticket Types

| Type | Price | Description |
|------|-------|-------------|
| Early Bird | RM 150 | Until July 31, 2026 |
| Standard | RM 250 | From August 1, 2026 |
| Family | RM 500 | 4 people, includes dinner |

## 💰 Fundraising Goals

- **Target:** RM 500,000
- **Usage:**
  - Student Sponsorship (RM 7,000/year × 6 years)
  - Basketball Court Grandstand
  - Commemorative Fund
  - Teacher Red Packets

## 🛠️ Troubleshooting (Windows)

### "npm install" fails with node-gyp errors

The `better-sqlite3` package requires native compilation. If you encounter errors:

1. Install Windows Build Tools:
   ```cmd
   npm install --global windows-build-tools
   ```

2. Then run:
   ```cmd
   npm install
   ```

### Port 3000 is already in use

Change the port in `server.js`:
```javascript
const PORT = process.env.PORT || 3001; // Change 3000 to another port
```

Then restart the server.

### Database errors

The SQLite database (`homecoming.db`) is auto-created on first run. If corrupted:

1. Stop the server
2. Delete `homecoming.db`
3. Restart the server

## 🌟 Production Deployment

For production on Windows:

1. **Use a process manager like PM2:**
   ```cmd
   npm install -g pm2
   pm2 start server.js --name homecoming
   ```

2. **Set environment variables:**
   ```cmd
   set NODE_ENV=production
   set PORT=80
   ```

3. **Consider using IIS with iisnode or Nginx as reverse proxy**

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones

## 🎨 Design Features

- Warm, nostalgic color palette (reds, golds, creams)
- Chinese and English bilingual support
- Smooth animations and transitions
- Modern card-based layouts
- Interactive countdown timer

## 📄 License

MIT License - Chong Hwa Independent High School Alumni Association

---

**Built with ❤️ for the Class of 2006 & 2001 Intake**

回家吃饭 🏠
