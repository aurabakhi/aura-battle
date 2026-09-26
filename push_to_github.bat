@echo off
echo ========================================
echo PUSH CODE TO GITHUB (USERS ONLY)
echo ========================================
echo.

echo Step 1: Removing old remote...
git remote remove origin
echo.

echo Step 2: Initializing Git...
git init
echo.

echo Step 3: Adding files (users only - admin/test excluded)...
git add .
echo.

echo Step 4: Creating initial commit...
git commit -m "Fix 404 error - embedded Firebase config in users/firebase.js"
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
echo NOTE: Admin và Test folders đã bị loại bỏ
echo Repository: https://github.com/aurabakhi/aura-battle/
echo.
pause