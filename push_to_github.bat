@echo off
echo ========================================
echo CLEAN & PUSH ONLY USERS FOLDER
echo ========================================
echo.

echo Step 1: Removing admin and test from git...
git rm -r --cached admin test
echo.

echo Step 2: Adding remaining files...
git add .
echo.

echo Step 3: Committing changes...
git commit -m "Remove admin and test folders - keep only users"
echo.

echo Step 4: Pushing to GitHub...
git push -u origin main
echo.

echo ========================================
echo DONE! Admin và Test đã bị xóa khỏi GitHub
echo ========================================
echo.
echo Repository: https://github.com/aurabakhi/aura-battle/
echo.
pause