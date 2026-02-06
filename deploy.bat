@echo off
echo ========================================
echo JGI Boardroom Booking - Deploy to Vercel
echo ========================================
echo.

REM Check if Vercel is installed
where vercel >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

REM Login to Vercel
echo.
echo Step 1: Login to Vercel
echo -----------------------
vercel login

REM Deploy
echo.
echo Step 2: Deploying to Vercel...
echo ------------------------------
vercel deploy --prod

echo.
echo ========================================
echo Deployment complete!
echo ========================================
pause
