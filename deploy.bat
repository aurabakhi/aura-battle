@echo off
echo ============================================
echo   Setup & Deploy to GitHub
echo ============================================
echo.

REM Check if .env exists, if not copy from example
if not exist ".env" (
    echo Creating .env from example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Edit .env with your actual credentials before running!
    echo.
)

REM Check if .git exists
if not exist ".git" (
    echo Initializing git repository...
    git init
) else (
    echo Git repository already exists
)

echo.
echo Renaming branch to main...
git branch -M main

echo.
echo Adding files to git...
git add .

echo.
echo Committing changes...
git commit -m "Update Discord bot with web interface"

echo.
echo ============================================
echo   Ready to push to GitHub!
echo ============================================
echo.
echo Please run the following commands manually:
echo   git remote add origin YOUR_GITHUB_REPO_URL
echo   git push -u origin main
echo.
pause
