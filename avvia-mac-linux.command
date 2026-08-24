#!/bin/bash
# Avvia la console di pianificazione turni portuali.
# Doppio clic su questo file, oppure eseguilo da terminale.

cd "$(dirname "$0")/src/Template.Web" || exit 1

echo "=============================================="
echo " Console di pianificazione turni portuali"
echo "=============================================="
echo

if ! command -v dotnet >/dev/null 2>&1; then
  echo "Non trovo .NET sul computer."
  echo "Scaricalo da https://dotnet.microsoft.com/download/dotnet/8.0 e riprova."
  echo
  read -r -p "Premi Invio per chiudere."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Manca la cartella node_modules, la ricostruisco..."
  npm install --silent || echo "  (npm non disponibile: le icone potrebbero non caricarsi)"
  echo
fi

echo "Preparo i pacchetti NuGet (la prima volta ci mette un paio di minuti)..."
dotnet restore || { echo; echo "Il ripristino dei pacchetti non e' riuscito: serve una connessione a internet."; read -r -p "Premi Invio per chiudere."; exit 1; }

echo
echo "Avvio in corso. Il browser si aprira' da solo su http://localhost:5178"
echo "Per fermare: premi Ctrl+C in questa finestra."
echo
echo "  marco.rossi@portodiesempio.it       Portuale2026   coordinatore"
echo "  amministrazione@portodiesempio.it   Portuale2026   amministrazione"
echo

( sleep 12; command -v open >/dev/null 2>&1 && open http://localhost:5178 || command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:5178 ) &

dotnet run --launch-profile http
