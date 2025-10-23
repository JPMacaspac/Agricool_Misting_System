# Agricool_Misting_System

An IoT-based agricultural misting system that monitors temperature, humidity, and water levels to automatically control a cooling misting system for livestock and crops.

---

## 📁 Project Structure

```
Agricool_Misting-System/
│
├── frontend/              # React Web Application
│   ├── src/
│   │   ├── pages/        # Dashboard, Login, Signup, Profile
│   │   ├── App.js
│   │   └── ...
│   └── package.json
│
├── backend/               # NestJS API Server
│   ├── src/
│   │   ├── sensors/      # Sensor data endpoints
│   │   ├── users/        # User authentication
│   │   └── main.ts
│   └── package.json
│
├── hardware/              # Arduino & ESP32 Code
│   ├── arduino_mega/     # Main controller
│   ├── esp32/            # WiFi bridge
│   └── README.md         # Wiring guide
│
└── docs/                  # Documentation
    └── FILES_TO_DELETE.md
```

---

## 🚀 Quick Start

### Backend Setup
```powershell
cd backend
npm install
npm run start:dev
```

### Frontend Setup
```powershell
cd frontend
npm install
npm start
```

### Hardware Setup
See `hardware/README.md` for complete wiring and ESP32 integration guide.

---

## 📊 Features

- ✅ Real-time temperature & humidity monitoring
- ✅ Automatic misting control based on temperature
- ✅ Water level monitoring with LED indicators
- ✅ Web dashboard with live sensor data
- ✅ User authentication
- ✅ WiFi connectivity via ESP32
- ⏳ Nextion display (awaiting delivery)

---

## 🔧 Hardware Components

- Arduino Mega 2560
- ESP32 WiFi Module
- DHT22 Temperature/Humidity Sensor
- Water Level Sensor
- LCD I2C Display (16x2)
- Relay Module + Water Pump
- LEDs (Red, Yellow, Green) + Buzzer

---

## 📚 Documentation

- **Hardware Wiring:** `hardware/README.md`
- **Cleanup Guide:** `docs/FILES_TO_DELETE.md`
- **API Endpoints:** Backend serves `/api/sensors`

---

### NOTE (FOR CONTRIBUTORS)
* Always backup your files before pulling from the repository
* Run `npm install` in both `frontend/` and `backend/` folders after pulling
* Hardware code is in `hardware/` folder (Arduino IDE)

---

## Help And Guide ( How to Run the Application )

### Manual Installation
```powershell
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Run Development Servers
```powershell
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm start
```

## GIT FEATURE

# Step 1: Initialize and set up remote and branches (if not already done)

| Command                                     | Description                                                       |
|---------------------------------------------|-------------------------------------------------------------------|
| git init                                  | Initialize a new Git repository locally                           |
| git branch -m main                        | Rename the default branch to 'main'                               |
| git remote add origin "Link"              | Add the remote repository URL (replace "Link" with your repo URL) |

<br>

# STEP 2: Pull data from repo branch to local computer 
### NOTES: Make sure local files is up-to-date from main branch before coding and pushing

| Command                                     | Description                                                       |
|---------------------------------------------|-------------------------------------------------------------------|
| git pull origin main                      | pull data of main to local computer                               |

<br>

# STEP 3: Push local data to repo

| Command                                     | Description                                                       |
|---------------------------------------------|-------------------------------------------------------------------|
| git add .                                 | Stage all files for the initial commit                            |
| git commit -m "Initial commit"            | Commit the staged files with a message                            |
| git push origin main                   | Push initial commit to remote 'main' branch and set upstream tracking |

<br>

# Undo merge
### If you have NOT pushed yet (This erases the merge commit locally.)

| Command                                     | Description                                                       |
|---------------------------------------------|-------------------------------------------------------------------|
| git checkout main                         | Switch to main branch                                             |
| git log                                   | Find the commit hash before merge                                 |
| git reset --hard <commit-hash>            | reset the ongoing merging process                                 |

<br>

### Forcefully go back (⚠️ risky with team)
* If you really want to erase history and reset main (not recommended if others already pulled):

| Command                                     | Description                                                       |
|---------------------------------------------|-------------------------------------------------------------------|
| git checkout main                         | Switch to main branch                                             |
| git reset --hard <old-commit-hash>        | Reset main to the exact commit before the merge (removes the merge and all commits after it). |
| git push origin main --force              | Force push your local main (now rolled back) to overwrite the remote main. |

## NOTES:
* Working alone → git reset --hard is fine.
* Working with a team → git revert is safer because it doesn’t rewrite history. 
<br>

# FULL GUIDE (Process of git command)

| New User (No existing branch)                                     | Old User (with existing branch)                                   |
|-------------------------------------------------------------------|-------------------------------------------------------------------|
| INITIALIZE LOCAL REPO (CREATE NEW BRANCH)                         | INITIALIZE LOCAL REPO (CHANGE BRANCH) - SKIP IF ALREADY DONE INITIALIZE |
|                                                                   |                                                                   |
| git init                                                        | git init                                                        |
| git branch -m main                                              | Rename the default branch to 'main'                               |
| git remote add origin "Link"                                    | git remote add origin "Link"                                    |
| git pull origin main                                            | git pull origin main / git pull origin your-branch-name       |
|                                                                   |                                                                   |
|                                                                   |                                                                   |
| PUSH LOCAL CHANGES TO MAIN                                        | PUSH LOCAL CHANGES TO OWN BRANCH                                  |
|                                                                   |                                                                   |
| git pull origin main                                            | git pull origin main / git pull origin your-branch-name       |
| git add .                                                       | git add .                                                       |
| git commit -m "Initial commit"                                  | git commit -m "Initial commit"                                  |
| git push origin main                                            | git push origin main                                            |
|                                                                   |                                                                   |

<br/>
<br/>
<br/>
<br>