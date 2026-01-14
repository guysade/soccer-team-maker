@echo off
echo Starting Soccer Team Maker...
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Start the data backup server first
echo Starting data backup server (port 3001)...
start /min cmd /c "node server.js"

REM Wait a moment for the data server
timeout /t 2 /nobreak >nul

REM Start the development server in the background
echo Starting development server (port 3000)...
start /min cmd /c "npm start"

REM Wait a few seconds for the server to start
echo Waiting for server to initialize...
timeout /t 8 /nobreak >nul

REM Open Chrome to the local development server
echo Opening Soccer Team Maker in Chrome...
start chrome "http://localhost:3000"

echo.
echo Soccer Team Maker is starting up!
echo.
echo Two servers are running in minimized windows:
echo   - Data backup server (port 3001)
echo   - React development server (port 3000)
echo.
echo Your data is now saved to: soccer-data.json
echo Close the server windows when you're done.
echo.
pause
