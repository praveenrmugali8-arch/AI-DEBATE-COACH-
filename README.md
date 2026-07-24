# AI Debate Coach 🎤

Practice, host, and review stronger debates with an AI-powered coach.  
This project provides authentication, live debate rooms with timers, chat, and private notes.

---

## 🚀 Features
- User authentication (register/login)
- Role selection: Student, Educator, or Hoster
- Create and join debate rooms
- Speaker timers with pause/resume
- Room chat for participants
- Private notes linked to speakers
- Dashboard to manage your debates

---

## 🛠️ Setup

### 1. Clone the repository
```bash
git clone https://github.com/praveenrmugali8-arch/AI-DEBATE-COACH-.git
cd AI-DEBATE-COACH-
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/debate_coach
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=production
PORT=3000
```

### 4. Build the project
```bash
npm run build
```

### 5. Start the development server
```bash
npm run dev
```

For production:
```bash
npm start
```

---

## 📦 Deployment on Vercel

### Quick Start
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **"New Project"** and import this repository
4. Vercel will auto-detect the configuration
5. Add environment variables in the Vercel dashboard
6. Deploy! 🚀

### Environment Variables on Vercel
Set these in your Vercel project settings:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - A secure random string for JWT signing

---

## 📁 Project Structure
```
AI-DEBATE-COACH-/
├── api/                  # Vercel serverless functions
│   └── index.js         # API entry point
├── outputs/
│   ├── Frontend.jsx     # React frontend component
│   └── backend.js       # Express backend server
├── src/
│   └── main.jsx         # React entry point
├── vercel.json          # Vercel configuration
├── package.json         # Dependencies
├── index.html           # HTML template
└── .env.example         # Environment variables template
```

---

## 🔧 Technologies Used
- **Frontend**: React 18 with Vite
- **Backend**: Express.js with Node.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Hosting**: Vercel

---

## 📝 API Endpoints

### Authentication
- `POST /auth/register` - Create a new account
- `POST /auth/login` - Sign in to your account

### Debates
- `GET /debates` - Get all debates
- `POST /debates` - Create a new debate
- `GET /debates/:id` - Get debate details
- `PATCH /debates/:id/end` - End a debate

### Messages & Notes
- `GET /debates/:id/messages` - Get room chat messages
- `POST /debates/:id/messages` - Send a message
- `GET /debates/:id/notes` - Get private notes
- `POST /debates/:id/notes` - Add a note

---

## 🤝 Contributing
Feel free to fork, improve, and submit pull requests!

---

## 📄 License
MIT License - feel free to use this project for personal or commercial purposes.

---

## 💡 Tips for Vercel Deployment
- Make sure your database is accessible from Vercel's servers
- Use environment variables for all sensitive data
- Test locally before deploying
- Check Vercel logs if deployment fails

---

Happy debating! 🎉
