@echo off
echo ========================================
echo PUSH TO GITHUB
echo ========================================
echo.

echo Step 1: Renaming branch to main...
git branch -M main
echo.

echo Step 2: Adding all files...
git add .
echo.

echo Step 3: Committing changes...
git commit -m "Update Discord bot"
echo.

echo Step 4: Pushing to GitHub...
git push -u origin main
echo.

echo ========================================
echo DONE!
echo ========================================
echo.
pause
