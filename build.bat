@echo off
title Build Hangly for Windows
echo ========================================================
echo   Building Native Hangly.exe for Windows
echo ========================================================

set CSC="C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if not exist %CSC% (
    echo [ERROR] .NET Framework 4.0 csc.exe compiler not found.
    pause
    exit /b 1
)

echo Compiling src\HanglyApp.cs...
%CSC% /target:winexe /out:"Hangly.exe" /win32icon:"Hangly.ico" /r:System.Windows.Forms.dll,System.Drawing.dll,System.dll,Microsoft.CSharp.dll "src\HanglyApp.cs"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo [SUCCESS] Hangly.exe built successfully!
echo You can now launch Hangly.exe or run Run-Hangly-Windows.bat.
pause
