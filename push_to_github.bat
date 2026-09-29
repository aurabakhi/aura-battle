@echo off
echo ========================================
echo CLEAN & PUSH ONLY FILES FROM USERS FOLDER
echo ========================================
echo.

echo Step 1: Moving files from users folder to root...
move users\index.html index.html
move users\script.js script.js
move users\style.css style.css
move users\firebase.js firebase.js
echo.

echo Step 2: Removing admin, test, and users folders from git...
git rm -r --cached admin test users
echo.

echo Step 3: Adding remaining files...
git add .
echo.

echo Step 4: Committing changes...
git commit -m "Flatten structure - move files from users to root, remove admin and test"
echo.

echo Step 5: Pushing to GitHub (force)...
git push -u origin main --force
echo.

echo ========================================
echo DONE! Files moved from users to root
echo ========================================
echo.
echo Repository: https://github.com/aurabakhi/aura-battle/
echo.
pause