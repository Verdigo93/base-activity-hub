@echo off
setlocal
cd /d "%~dp0"
title Base Activity Hub - GitHub Publish

echo =======================================================
echo  Base Activity Hub - publish to GitHub
echo  Account: Verdigo93
echo =======================================================
echo.
echo STEP 1: Create an EMPTY PUBLIC repository:
echo   https://github.com/new
echo Repository name: base-activity-hub
echo Do NOT add README, .gitignore or license on GitHub.
echo.
echo STEP 2: Make sure Git for Windows is installed:
echo   https://git-scm.com/downloads/win
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found. Install Git for Windows, then try again.
  pause
  exit /b 1
)

set "TARGET=https://github.com/Verdigo93/base-activity-hub.git"
echo Target: %TARGET%
echo.
set /p "GO=Have you created the EMPTY public repo? Type YES: "
if /i not "%GO%"=="YES" (
  echo Cancelled. Create the repository first, then rerun.
  pause
  exit /b 1
)

if not exist ".git" (
  git init
  if errorlevel 1 goto error
)
git branch -M main
git config --local user.name "Verdigo93"
git config --local user.email "119045086+Verdigo93@users.noreply.github.com"

git add -A
if errorlevel 1 goto error
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat: publish Base Activity Hub initial development version"
  if errorlevel 1 goto error
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%TARGET%"
  if errorlevel 1 goto error
) else (
  git remote set-url origin "%TARGET%"
)

echo.
echo Pushing to GitHub. Git Credential Manager may open your browser.
git push -u origin main
if errorlevel 1 goto error
echo.
echo SUCCESS! https://github.com/Verdigo93/base-activity-hub
echo You can now connect your repository to Render or another host.
pause
exit /b 0

:error
echo.
echo Publication failed. No private keys were requested or stored.
echo If the repository was not empty, Git may reject the push.
echo Verify the target repo and login, then rerun this script.
pause
exit /b 1
