@echo off
echo ========================================
echo PUSH TO GITHUB
echo ========================================
echo.

echo Step 1: Adding all files...
git add .
echo.

echo Step 2: Committing changes...
git commit -m "Update Aura Battle website"
echo.

echo Step 3: Pushing to GitHub...
git push -u origin main
echo.

echo ========================================
echo DONE!
echo ========================================
echo.
echo Repository: https://github.com/aurabakhi/aura-battle/
echo.
pause