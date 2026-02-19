# Arbeitszeit-Rechner für Schulen in Hessen

Ein schlankes Webtool zur Berechnung der monatlichen und jährlichen Arbeitszeit für Mitarbeitende an Schulen in Hessen – inklusive Teilzeitmodellen, Schulferien, Feiertagen und individuellem Urlaubsplan.

→ **[arbeitszeit.aqja.de](https://umfluten.de/arbeitszeit)** (oder direkt `index.html` lokal öffnen)

## Features

- Schuljahrauswahl 2022/23 – 2028/29
- Vollzeit und Teilzeit (1–100 %), konfigurierbarer Wochenplan
- Automatischer Abruf von Ferien und Feiertagen (Hessen) über offizielle APIs
- Bis zu 30 flexible Ferientage sowie interaktiver Urlaubskalender
- Monatliche Aufschlüsselung, Kalenderansicht
- Stundenformat umschaltbar: Dezimal (`4,5h`) oder HH:MM (`4:30`)
- Dark Mode (folgt Betriebssystem-Einstellung)
- Eingaben werden lokal im Browser gespeichert (kein Server, kein Tracking)

## Verwendung

1. `index.html` im Browser öffnen – kein Build-Schritt, keine Installation
2. Schuljahr, Arbeitszeitmodell und ggf. Wochenplan eingeben
3. „Daten laden" klicken

## Berechnungsgrundlagen

- 39 Stunden/Woche bei 100 % (Hessen)
- 30 Tage gesetzlicher Urlaub
- Feiertage werden wie Wochenenden behandelt (keine Arbeitstage)
- Mehrarbeit wird gleichmäßig auf alle Schultage verteilt

Das Tool dient zur Orientierung. Bei Fragen zu individuellen Regelungen bitte Schulleitung oder Personalvertretung konsultieren.

## Datenquellen

- Feiertage: [feiertage-api.de](https://feiertage-api.de)
- Schulferien: [schulferien-api.de](https://schulferien-api.de)

## Lizenz

[MIT](LICENSE) – © aqja
