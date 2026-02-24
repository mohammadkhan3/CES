# CES
Cinema E-Booking System -- SWE

## backend set up
- make sure that you have python downloaded
command in terminal: 
```bash
python3 --version
```

- create & activate virtual environment (might be different on windows/powershell system)
```bash 
cd CES/backend
python3 -m venv .venv
source .venv/bin/activate
```

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

- create backend environment file (CES/backend/.env), in the file add these lines:
PORT=5000 
MONGO_URI=[REPLACE_ME] 
MONGO_DB=ces_db

- create .gitignore file with these contents:
.venv/
.env
__pycache__/
*.pyc

## frontend set up

- make sure that you have node.js downloaded:
```bash
node --version
```
- make sure that npm is installed
```bash
npm --version
```
- go to the front end directory
```bash
cd CES/frontend/cinema-ebooking
```
- install the frontend dependencies
```bash
npm install
```
- create frontend environment file (CES/frontend/cinema-ebooking/.env.local) and add this line:
BACKEND_BASE_URL=http://localhost:5000

- to run the frontend server
``` bash
npm run dev
```

- ensure that the backend is running before starting the frontend up.
