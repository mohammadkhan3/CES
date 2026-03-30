# CES
Cinema E-Booking System -- SWE

1)
## backend set up
- make sure that you have python downloaded
command in terminal: 
```bash
python3 --version
```

2)
- create & activate virtual environment (might be different on windows/powershell system)
```bash 
cd CES/backend
python3 -m venv .venv
source .venv/bin/activate

```
2)
- install dependencies for backend:
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```
- if pip doesn't work, command: 
```bash
python -m pip install -r requirements.txt
```
- dependencies for db:
```bash
pip install certifi pymongo python-dotenv
```

4)
- create backend environment file (CES/backend/.env), in the file add these lines:
PORT=5000
MONGO_URI=[REPLACE_ME]
MONGO_DB=ces_db
SECRET_KEY=ces_secret_key_2026
SENDGRID_API_KEY=[REPLACE_ME]
EMAIL_SENDER=[REPLACE_ME]
APP_BASE_URL=http://localhost:3000

- create .gitignore file with these contents:
.venv/
.env
__pycache__/
*.pyc

6)
Testing:
- TERMINAL 1 - Start the backend, but seed database first:
```bash
cd backend
source .venv/bin/activate
python seed.py
python run.py
```

- TERMINAL 2 - Start the frontend:
```bash
cd CES/frontend/cinema-ebooking
npm install
npm run dev
```

- Then open browser at: http://localhost:3000


- To test different User Roles (seeded pre-set roles)
```
Admin: `admin@ces.com` / `ChangeMe123!`
Customer: `john@example.com` / `ChangeMe123!!`
```