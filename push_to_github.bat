@echo off
echo ========================================
echo PUSH CODE TO GITHUB
echo ========================================
echo.

echo Step 1: Initializing Git...
git init
echo.

echo Step 2: Adding files...
git add .
echo.

echo Step 3: Creating initial commit...
git commit -m "Initial commit - Aura Battle Tournament System"
echo.

echo Step 4: Setting main branch...
git branch -M main
echo.

echo Step 5: Adding remote repository...
git remote add origin https://github.com/aurabakhi/aura-battle.git
echo.

echo Step 6: Pushing to GitHub...
git push -u origin main
echo.

echo ========================================
echo DONE! Code đã được push lên GitHub
echo ========================================
echo.
echo Repository: https://github.com/aurabakhi/aura-battle/
echo.
pause