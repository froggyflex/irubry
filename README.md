# Rubrica Pianura Est

Applicazione statica per consultare una rubrica di organizzazioni territoriali a partire dal file Excel `Mappatura.Pianura.Est.xlsx`.

## Cosa contiene

- Ricerca libera per nome, comune, categoria, servizio e descrizione.
- Filtri per comune, categoria, servizi, 5x1000 e rete territoriale.
- Scheda profilo con attività, servizi, link e dati amministrativi.
- Assistente locale che prova a trasformare una richiesta semplice in filtri.
- Nessuna dipendenza di runtime: funziona con HTML, CSS, JavaScript e JSON.

## Struttura

```text
.
├── index.html
├── styles.css
├── app.js
├── data/
│   └── organisations.json
└── README.md
```

## Avvio locale

Serve aprire il progetto tramite un piccolo server locale, perché il browser deve leggere `data/organisations.json`.

Con Python:

```bash
python -m http.server 5173
```

Poi aprire:

```text
http://127.0.0.1:5173
```

## Pubblicazione su GitHub Pages

1. Caricare questi file in un repository GitHub.
2. Aprire `Settings` -> `Pages`.
3. Selezionare il branch principale e la cartella root.
4. Salvare: GitHub pubblicherà l'app come sito statico.

## Aggiornare i dati

Il file `data/organisations.json` è generato dal foglio `Tabella` del workbook. I servizi sono stati letti dalle celle verdi nelle colonne dei servizi, non dal testo della cella.
