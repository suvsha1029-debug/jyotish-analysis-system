@echo off
title Jyotish JavaScript Chrome Test
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_chrome_test.ps1"
if errorlevel 1 pause
