# Rubrica Pianura Est

Sito statico per trovare organizzazioni e servizi nei 15 comuni della Pianura Est. I dati delle organizzazioni provengono dal workbook `Mappatura.Pianura.Est.xlsx`.

## Pagine

- `index.html`: mappa dei comuni con zoom tramite rotella, scelta della zona e collegamenti ai servizi presenti nel comune.
- `rubrica.html`: ricerca per parola o richiesta semplice con riconoscimento dei comuni, filtri su richiesta, ricerche recenti e schede salvate nel browser, risultati paginati e profili in finestra di dialogo. I profili hanno un link condivisibile.
- `mappa.html`: confini comunali interattivi, punti delle organizzazioni geolocalizzate, ricerca locale e elenco completo degli enti del comune. L'elenco consente di aprire anche le schede prive di coordinate.
- `segnala.html`: modulo per aggiunte e correzioni, inviato al team tramite Formspree. La segnalazione non modifica automaticamente i dati pubblicati.

## Dati e dipendenze

- `data/organisations.json`: 469 schede. I servizi derivano dalle celle verdi del foglio `Tabella`.
- `data/municipalities.geojson`: confini dei 15 comuni, estratti dai [confini ISTAT distribuiti da geojson-italy](https://github.com/guglielmo/geojson-italy) (CC BY 4.0).
- [Leaflet](https://leafletjs.com/) e le mappe [OpenStreetMap](https://www.openstreetmap.org/) vengono caricati online. Se non sono disponibili, i menu dei comuni e la rubrica restano utilizzabili.
- Non serve un backend per la ricerca. Il modulo usa l'endpoint Formspree configurato in `segnala.html`; sostituirlo se cambia il destinatario.

Solo 281 delle 469 schede hanno coordinate: un ente senza posizione appare nella rubrica, ma non come punto sulla mappa. Inoltre, 126 schede non hanno un comune assegnato e quindi non compaiono quando si filtra per zona. Alcuni record di questo gruppo hanno nomi importati in modo incompleto o concatenato e richiedono una revisione dei dati. La selezione dei comuni utilizza il campo `municipality` delle schede; non assegna automaticamente un comune da coordinate che potrebbero appartenere a un record importato male.

## Avvio locale

Servire la cartella del progetto con un server HTTP, per esempio:

```bash
python -m http.server 5187
```

Aprire `http://127.0.0.1:5187/`. Un server è necessario perché il browser carica i file JSON con `fetch`.

## GitHub Pages

Caricare i file nel repository, poi scegliere il branch principale e la cartella root in `Settings > Pages`. Tutti i collegamenti interni sono relativi e funzionano anche in un sito Pages sotto un percorso di repository.

## Aggiornare le organizzazioni

Aggiornare `data/organisations.json` conservando gli ID e i nomi dei comuni usati nei filtri. Per aggiungere un nuovo comune, aggiornare anche `data/municipalities.geojson`. Ricerche recenti e schede salvate sono locali al browser; non sono condivise tra dispositivi.
