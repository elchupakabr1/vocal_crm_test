@echo off
echo Starting Vocal CRM deployment...

:: Проверка наличия Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed! Please install Python 3.8 or higher.
    pause
    exit /b 1
)

:: Проверка наличия Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed! Please install Node.js 14 or higher.
    pause
    exit /b 1
)

:: Проверка наличия npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo npm is not installed! Please install npm.
    pause
    exit /b 1
)

:: Создание виртуального окружения для бэкенда
echo Creating Python virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

:: Установка зависимостей бэкенда
echo Installing backend dependencies...
cd backend
pip install -r requirements.txt
pip install uvloop  # Установка uvloop для оптимизации производительности

:: Создание файла .env для бэкенда
echo Creating backend .env file...
(
echo SECRET_KEY=%RANDOM%%RANDOM%%RANDOM%
echo TELEGRAM_BOT_TOKEN=your-telegram-bot-token
echo CHAT_ID=your-telegram-chat-id
) > .env

:: Инициализация базы данных
echo Initializing database...
python init_db.py
cd ..

:: Установка зависимостей фронтенда
echo Installing frontend dependencies...
cd frontend
npm install

:: Оптимизация сборки фронтенда
echo Optimizing frontend build...
npm install --save-dev compression-webpack-plugin
npm install --save-dev terser-webpack-plugin
npm install --save-dev css-minimizer-webpack-plugin

:: Создание файла .env для фронтенда
echo Creating frontend .env file...
(
echo REACT_APP_API_URL=http://localhost:8000
echo GENERATE_SOURCEMAP=false
) > .env
cd ..

:: Создание скриптов запуска
echo Creating startup scripts...

:: Скрипт для запуска бэкенда с оптимизациями
echo @echo off > start_backend.bat
echo call venv\Scripts\activate.bat >> start_backend.bat
echo cd backend >> start_backend.bat
echo set PYTHONUNBUFFERED=1 >> start_backend.bat
echo set PYTHONHASHSEED=random >> start_backend.bat
echo uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --loop uvloop --limit-concurrency 1000 --timeout-keep-alive 30 --access-log >> start_backend.bat

:: Скрипт для запуска фронтенда с оптимизациями
echo @echo off > start_frontend.bat
echo cd frontend >> start_frontend.bat
echo set NODE_OPTIONS=--max-old-space-size=4096 >> start_frontend.bat
echo npm start >> start_frontend.bat

:: Скрипт для запуска Telegram бота
echo @echo off > start_telegram.bat
echo call venv\Scripts\activate.bat >> start_telegram.bat
echo cd backend >> start_telegram.bat
echo python telegram_bot.py >> start_telegram.bat

:: Создание README с инструкциями
echo Creating README...
(
echo Vocal CRM Deployment Instructions
echo ==============================
echo.
echo 1. Start the backend server:
echo    Double-click start_backend.bat
echo.
echo 2. Start the frontend server:
echo    Double-click start_frontend.bat
echo.
echo 3. Start the Telegram bot:
echo    Double-click start_telegram.bat
echo.
echo Default login credentials:
echo Username: admin
echo Password: admin
echo.
echo Performance Optimizations:
echo - Backend uses uvloop for better performance
echo - Frontend is optimized with webpack
echo - Database connections are pooled
echo - API responses are compressed
echo.
echo Note: Make sure to update the Telegram bot token and chat ID in backend/.env
) > DEPLOYMENT_README.txt

echo.
echo Deployment completed successfully!
echo.
echo Please read DEPLOYMENT_README.txt for instructions on how to start the application.
echo.
echo Important: Update the Telegram bot token and chat ID in backend/.env before starting the Telegram bot.
echo.
pause 