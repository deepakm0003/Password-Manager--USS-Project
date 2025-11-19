# How to Start the Backend Server

## Quick Start

1. **Open a terminal** (PowerShell, Command Prompt, or VS Code terminal)

2. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

3. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **You should see:**
   ```
   🚀 Server running on port 5000
   🌐 Listening on: http://0.0.0.0:5000 (accessible from all network interfaces)
   🔗 Health check: http://localhost:5000/health
   🔗 iOS Simulator: http://localhost:5000/health
   🔗 Android Emulator: http://10.0.2.2:5000/health
   ```

## Verify Backend is Running

Open your browser and visit:
- `http://localhost:5000/health`

You should see:
```json
{"status":"ok","timestamp":"..."}
```

## Troubleshooting

### Port 5000 Already in Use
If you see "Port 5000 is already in use":
- Find the process using port 5000:
  ```bash
  netstat -ano | findstr :5000
  ```
- Kill the process (replace PID with the actual process ID):
  ```bash
  taskkill /PID <PID> /F
  ```
- Start the backend again

### Database Connection Error
If you see database connection errors:
- Make sure PostgreSQL is running
- Check your `.env` file has correct `DATABASE_URL`
- Run: `npm run prisma:generate`

### TypeScript Compilation Errors
If you see compilation errors:
- Make sure all dependencies are installed: `npm install`
- Check for syntax errors in the error message
- Fix the errors and restart the server

## Keep Backend Running

⚠️ **IMPORTANT:** The backend must be running for the app to work!

- Keep the terminal window open while using the app
- The server will auto-restart when you save files (thanks to `ts-node-dev`)
- Press `Ctrl+C` to stop the server

