@echo off
echo ========================================
echo PUSH CODE TO GITHUB
echo ========================================
echo.

echo Step 1: Removing old remote...
git remote remove origin
echo.

echo Step 2: Initializing Git...
git init
echo.

echo Step 3: Adding files...
git add .
echo.

echo Step 4: Creating initial commit...
git commit -m "Initial commit - Aura Battle Tournament System"
echo.

echo Step 5: Setting main branch...
git branch -M main
echo.

echo Step 6: Adding remote repository...
git remote add origin https://github.com/aurabakhi/aura-battle.git
echo.

echo Step 7: Pushing to GitHub (force)...
git push -u origin main --force
echo.

echo ========================================
echo DONE! Code đã được push lên GitHub
echo ========================================
echo.
echo Repository: https://github.com/aurabakhi/aura-battle/
echo.
pause