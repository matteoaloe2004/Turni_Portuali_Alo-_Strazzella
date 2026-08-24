@echo off
REM Avvia la console di pianificazione turni portuali.
REM Doppio clic su questo file.

cd /d "%~dp0src\Template.Web"

echo ==============================================
echo  Console di pianificazione turni portuali
echo ==============================================
echo.

where dotnet >nul 2>&1
if errorlevel 1 (
  echo Non trovo .NET sul computer.
  echo Scaricalo da https://dotnet.microsoft.com/download/dotnet/8.0 e riprova.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Manca la cartella node_modules, la ricostruisco...
  call npm install --silent
  echo.
)

echo Preparo i pacchetti NuGet ^(la prima volta ci mette un paio di minuti^)...
dotnet restore
if errorlevel 1 (
  echo.
  echo Il ripristino dei pacchetti non e' riuscito: serve una connessione a internet.
  pause
  exit /b 1
)

echo.
echo Avvio in corso. Il browser si aprira' da solo su http://localhost:5178
echo Per fermare: premi Ctrl+C in questa finestra.
echo.
echo   marco.rossi@portodiesempio.it       Portuale2026   coordinatore
echo   amministrazione@portodiesempio.it   Portuale2026   amministrazione
echo.

dotnet run --launch-profile http
pause
