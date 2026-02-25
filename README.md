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

- ## seed the database
- after setting up your .env file, run:
```bash
python seed.py
