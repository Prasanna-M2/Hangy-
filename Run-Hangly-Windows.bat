@echo off
setlocal
title Hangly for Windows
echo ====================================================
echo      Starting Hangly for Windows Application
echo      A tiny piece of motion for your desktop
echo ====================================================
echo.

set "SCRIPT_DIR=%~dp0"

:: 1. Create Desktop shortcut if not present
if not exist "%USERPROFILE%\Desktop\Hangly.lnk" (
  cscript.exe //Nologo "%SCRIPT_DIR%create_shortcut.vbs" >nul 2>&1
)

:: 2. Start Web Studio Server in background
start /B node "%SCRIPT_DIR%server.js" > "%TEMP%\hangly_server.log" 2>&1

:: Wait a brief moment
timeout /t 1 /nobreak >nul

:: 3. Open Web Studio in default browser
start http://localhost:3030

:: 4. Start Native Windows Desktop Floating App
echo Starting Native Windows Desktop Charm...
start "" "%SCRIPT_DIR%Hangly.exe"

echo.
echo Hangly is now running on your Windows desktop!
echo Check your screen corner and system tray icon.
timeout /t 3 /nobreak >nul
