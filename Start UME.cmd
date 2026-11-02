@echo off
cd /d "%~dp0"
if not exist node_modules call npm ci
if not exist .env (
  echo Create .env from .env.example and set your owner username and password first.
  pause
  exit /b 1
)
echo Customer portal: http://127.0.0.1:3000/
echo Owner studio: http://127.0.0.1:3000/owner
call npm run dev
