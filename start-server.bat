@echo off
echo ========================================
echo Backgammon Checker Detector
echo Starting PHP server...
echo ========================================
echo.
echo Server will start on: http://localhost:8000
echo.
echo To access from mobile device:
echo 1. Find your computer's IP address (ipconfig)
echo 2. Open http://YOUR_IP:8000 on your mobile browser
echo.
echo For HTTPS (required for camera on mobile):
echo Use ngrok or localtunnel for secure connection
echo.
echo ========================================
echo.

php -S localhost:8000 -t public

pause

