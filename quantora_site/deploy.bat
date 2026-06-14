@echo off
cd /d "%~dp0"
echo Deploying Quantora to Vercel...
echo (First time: it will open your browser to log in to Vercel.)
echo.
npx vercel --prod --yes
echo.
echo ==============================================
echo  Your live URL is shown above - copy it!
echo ==============================================
pause
