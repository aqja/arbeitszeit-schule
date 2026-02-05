# Arbeitszeit-Rechner für Schulen in Hessen

Ein schlankes Webtool zur Berechnung der monatlichen und jährlichen Arbeitszeit für Lehrkräfte an Schulen in Hessen.

## Beschreibung

Dieses Tool berechnet die Arbeitszeitverteilung für Lehrkräfte unter Berücksichtigung von:
- Schuljahreszeitraum (1. August bis 31. Juli)
- Wöchentlicher Arbeitszeit (Basis: 40 Stunden für 100% Stelle)
- Schulferien in Hessen
- Gesetzlichen Feiertagen in Hessen
- Flexiblen Ferientagen
- Gesetzlichem Urlaubsanspruch (30 Tage)

Das Tool zeigt, wie viele Überstunden während der Schultage geleistet werden müssen, um die verbleibenden schulfreien Tage zu kompensieren.

## Features

- **Schuljahrauswahl**: 2023/24, 2024/25, 2025/26
- **Teilzeitmodelle**: Unterstützung für 1-100% Stellen
- **Flexible Ferientage**: Individuelle Eingabe variabler Ferientage
- **Automatische Datenabfrage**: Ferien und Feiertage werden von offiziellen APIs geladen
- **Detaillierte Übersicht**:
  - Anzahl Schultage und schulfreie Tage
  - Tägliche Mehrarbeit während der Schulzeit
  - Wöchentliche Arbeitszeit während der Schulzeit
  - Monatliche Aufschlüsselung
  - Visuelle Kalenderdarstellung
- **Offline-fähig**: Daten werden im Browser gecacht (24 Stunden)
- **Responsives Design**: Funktioniert auf Desktop, Tablet und Smartphone

## Installation

### Variante 1: Lokale Verwendung

1. Laden Sie alle Dateien herunter
2. Öffnen Sie `index.html` in einem modernen Webbrowser
3. Fertig!

### Variante 2: Shared-Hosting

1. Laden Sie alle Dateien auf Ihren Webserver hoch:
   ```
   /public_html/
   ├── index.html
   ├── styles.css
   ├── script.js
   └── calculator.js
   ```

2. Öffnen Sie die URL in Ihrem Browser

### Variante 3: GitHub Pages (kostenlos)

1. Erstellen Sie ein GitHub-Repository
2. Laden Sie die Dateien hoch
3. Aktivieren Sie GitHub Pages in den Repository-Einstellungen
4. Ihre App ist unter `https://ihrusername.github.io/repository-name/` erreichbar

## Verwendung

### Schritt 1: Schuljahr auswählen
Wählen Sie das gewünschte Schuljahr aus der Dropdown-Liste.

### Schritt 2: Arbeitszeitmodell eingeben
Geben Sie Ihr Arbeitszeitmodell in Prozent ein:
- 100% = 40 Stunden/Woche (Vollzeit)
- 75% = 30 Stunden/Woche
- 50% = 20 Stunden/Woche

### Schritt 3: Flexible Ferientage
1. Geben Sie die Anzahl der flexiblen Ferientage ein
2. Wählen Sie die Daten für jeden flexiblen Ferientag

### Schritt 4: Berechnen
Klicken Sie auf "Berechnen" - die App lädt automatisch die aktuellen Ferien- und Feiertagsdaten.

### Ergebnisse verstehen

#### Werktage gesamt
Alle Montag-Freitag-Tage im Schuljahr (ohne Wochenenden).

#### Schultage
Werktage minus schulfreie Tage (Ferien + Feiertage + flexible Ferientage).

#### Schulfreie Tage
Summe aus Schulferien, Feiertagen (die nicht in Ferien fallen) und flexiblen Ferientagen.

#### Verbleibende freie Tage
Schulfreie Tage minus 30 Tage gesetzlicher Urlaub.
Diese Tage müssen durch Mehrarbeit während der Schultage kompensiert werden.

#### Tägliche Mehrarbeit
Zusätzliche Arbeitsstunden pro Schultag, um die verbleibenden freien Tage zu kompensieren.

**Formel**: `(Verbleibende freie Tage × Tägliche Sollarbeitszeit) ÷ Anzahl Schultage`

Wobei **Tägliche Sollarbeitszeit** = 7,8h × (Arbeitszeitmodell / 100)
- 100% Vollzeit: 7,8h/Tag
- 75% Teilzeit: 5,85h/Tag
- 50% Teilzeit: 3,9h/Tag

#### Wochenarbeitszeit (Schulzeit)
Tatsächliche wöchentliche Arbeitszeit während der Schulzeit.

**Formel**: `Sollstunden + (5 × tägliche Mehrarbeit)`

## Technische Details

### Architektur

```
┌─────────────┐
│  index.html │  ← Benutzeroberfläche
└─────────────┘
      │
      ├─── styles.css     ← Styling
      ├─── script.js      ← UI-Logik & API-Integration
      └─── calculator.js  ← Berechnungslogik
```

### Verwendete APIs

#### Feiertage-API.de
- **URL**: https://feiertage-api.de/api/
- **Dokumentation**: https://feiertage-api.de/
- **Beispiel**: `https://feiertage-api.de/api/?jahr=2024&nur_land=HE`
- **CORS**: Ja
- **Authentifizierung**: Keine

#### Schulferien-API.de
- **URL**: https://schulferien-api.de/api/v1/
- **Dokumentation**: https://schulferien-api.de/
- **Beispiel**: `https://schulferien-api.de/api/v1/2024/HE/`
- **CORS**: Ja
- **Authentifizierung**: Keine

### Browser-Kompatibilität

- Chrome/Edge: ab Version 90
- Firefox: ab Version 88
- Safari: ab Version 14
- Opera: ab Version 76

**Erforderliche Features**:
- ES6+ JavaScript
- Fetch API
- LocalStorage
- CSS Grid & Flexbox

### Datenschutz

- Alle Berechnungen erfolgen lokal im Browser
- Keine Daten werden an externe Server gesendet (außer API-Aufrufe für Ferien/Feiertage)
- Cache wird nur im Browser gespeichert
- Keine Cookies, kein Tracking

## Fehlerbehebung

### Problem: "Fehler beim Laden der Feiertage"

**Ursachen**:
- Keine Internetverbindung
- API temporär nicht erreichbar
- Browser blockiert API-Aufrufe

**Lösung**:
1. Internetverbindung prüfen
2. Seite neu laden
3. Cache leeren (Browser-Einstellungen)
4. Später erneut versuchen

### Problem: Ergebnisse werden nicht angezeigt

**Lösung**:
1. Browser-Konsole öffnen (F12)
2. Fehlermeldungen prüfen
3. JavaScript aktiviert?
4. In einem anderen Browser testen

### Problem: Falsche Berechnung

**Prüfen Sie**:
- Ist das richtige Schuljahr ausgewählt?
- Sind flexible Ferientage korrekt eingegeben?
- Liegt das Datum der flexiblen Ferientage im Schuljahr?

### Cache leeren

Falls veraltete Daten angezeigt werden:

**Chrome/Edge**:
1. F12 → Application → Local Storage
2. Einträge mit "holidays" oder "vacations" löschen

**Firefox**:
1. F12 → Storage → Local Storage
2. Einträge löschen

**Oder**: Private/Inkognito-Fenster verwenden

## Berechnungsbeispiele

### Beispiel 1: 100% Vollzeitstelle, Schuljahr 2024/2025

```
Ausgangsdaten:
- Schuljahr: 01.08.2024 - 31.07.2025
- Arbeitszeitmodell: 100% (39h/Woche, 7,8h/Tag)
- Werktage gesamt: ~260 Tage
- Schulferien: ~75 Tage
- Feiertage (nur Werktage, nicht in Ferien): ~8 Tage
- Flexible Ferientage: 0 Tage

Berechnung:
1. Schulfreie Tage = 75 + 8 + 0 = 83 Tage
2. Schultage = 260 - 83 = 177 Tage
3. Verbleibende freie Tage = 83 - 30 (Urlaub) = 53 Tage
4. Tägliche Sollarbeitszeit = 7,8h × 100% = 7,8h
5. Zu kompensierende Stunden = 53 Tage × 7,8h = 413,4h
6. Tägliche Mehrarbeit = 413,4h ÷ 177 Tage = 2,34h
7. Wochenarbeitszeit (Schulzeit) = 39h + (5 × 2,34h) = 50,7h

Ergebnis:
- Während der Schulzeit: ~50,7h/Woche
- An schulfreien Tagen: 0h/Woche
- Jahresschnitt: 39h/Woche ✓
```

### Beispiel 2: 50% Teilzeitstelle, Schuljahr 2024/2025

```
Ausgangsdaten:
- Schuljahr: 01.08.2024 - 31.07.2025
- Arbeitszeitmodell: 50% (19,5h/Woche, 3,9h/Tag)
- Werktage gesamt: ~260 Tage
- Schulferien: ~75 Tage
- Feiertage (nur Werktage, nicht in Ferien): ~8 Tage
- Flexible Ferientage: 0 Tage

Berechnung:
1. Schulfreie Tage = 75 + 8 + 0 = 83 Tage
2. Schultage = 260 - 83 = 177 Tage
3. Verbleibende freie Tage = 83 - 30 (Urlaub) = 53 Tage
4. Tägliche Sollarbeitszeit = 7,8h × 50% = 3,9h
5. Zu kompensierende Stunden = 53 Tage × 3,9h = 206,7h
6. Tägliche Mehrarbeit = 206,7h ÷ 177 Tage = 1,17h
7. Wochenarbeitszeit (Schulzeit) = 19,5h + (5 × 1,17h) = 25,35h

Ergebnis:
- Während der Schulzeit: ~25,4h/Woche
- An schulfreien Tagen: 0h/Woche
- Jahresschnitt: 19,5h/Woche ✓
```

### Beispiel 3: 25% Teilzeitstelle (sehr niedrige Teilzeit)

```
Ausgangsdaten:
- Schuljahr: 01.08.2024 - 31.07.2025
- Arbeitszeitmodell: 25% (9,75h/Woche, 1,95h/Tag)
- Werktage gesamt: ~260 Tage
- Schulfreie Tage: 83 Tage
- Schultage: 177 Tage
- Verbleibende freie Tage: 53 Tage

Berechnung:
1. Tägliche Sollarbeitszeit = 7,8h × 25% = 1,95h
2. Zu kompensierende Stunden = 53 Tage × 1,95h = 103,35h
3. Tägliche Mehrarbeit = 103,35h ÷ 177 Tage = 0,58h
4. Wochenarbeitszeit (Schulzeit) = 9,75h + (5 × 0,58h) = 12,65h

Ergebnis:
- Während der Schulzeit: ~12,7h/Woche
- An schulfreien Tagen: 0h/Woche
- Jahresschnitt: 9,75h/Woche ✓
```

**Wichtig**: Bei Teilzeit reduziert sich sowohl die Sollarbeitszeit als auch die zu kompensierende Zeit proportional. Ein schulfreier Tag zählt bei 50% Teilzeit nur 3,9 Stunden, bei 25% Teilzeit nur 1,95 Stunden statt 7,8 Stunden (100% Vollzeit). Das Tool unterstützt jedes Arbeitszeitmodell von 1% bis 100%.

## Anpassungen und Erweiterungen

### Andere Bundesländer

Um das Tool für andere Bundesländer anzupassen:

1. Öffnen Sie `script.js`
2. Ändern Sie in den API-URLs `HE` zu Ihrem Bundesland-Kürzel:
   - Bayern: BY
   - Baden-Württemberg: BW
   - Nordrhein-Westfalen: NW
   - etc.

```javascript
// Zeile ~67 und ~95 in script.js
const url = `${API_CONFIG.holidays}?jahr=${year}&nur_land=BY`; // Beispiel für Bayern
```

### Weitere Schuljahre hinzufügen

In `index.html`, Zeile 25-29:

```html
<select id="schoolYear" name="schoolYear">
    <option value="2022-2023">2022/2023</option>
    <option value="2023-2024">2023/2024</option>
    <option value="2024-2025" selected>2024/2025</option>
    <option value="2025-2026">2025/2026</option>
    <option value="2026-2027">2026/2027</option>
</select>
```

### Andere Wochenarbeitszeit

Um die Basisarbeitszeit zu ändern (Standard: 39h für Hessen):

In `calculator.js`, Zeile ~287 und ~293:

```javascript
// Wöchentliche Sollarbeitszeit
const weeklyTargetHours = 40 * (workPercentage / 100); // Beispiel für 40h

// Tägliche Sollarbeitszeit
const dailyTargetHours = 8 * (workPercentage / 100); // Beispiel für 8h/Tag
```

**Wichtig**: Beide Werte müssen zusammenpassen! Bei 40h/Woche sind es 8h/Tag (40 ÷ 5), bei 39h/Woche sind es 7,8h/Tag (39 ÷ 5).

## Projektstruktur

```
arbeitszeit-schule/
│
├── index.html           # Hauptseite
│   ├── Eingabeformular
│   ├── Ergebnisanzeige
│   └── Monatliche Tabelle
│
├── styles.css           # Styling
│   ├── Responsive Design
│   ├── Farbschema
│   └── Animationen
│
├── calculator.js        # Berechnungslogik
│   ├── Datumsverarbeitung
│   ├── Arbeitszeitberechnung
│   └── Monatsaufschlüsselung
│
├── script.js            # UI & API
│   ├── DOM-Manipulation
│   ├── API-Integration
│   ├── Caching
│   └── Event-Handler
│
└── README.md            # Diese Datei
```

## Lizenz

Dieses Projekt ist gemeinfrei. Sie können es frei verwenden, modifizieren und verteilen.

## Datenquellen

- **Feiertage**: [Feiertage-API.de](https://feiertage-api.de) - bundesAPI
- **Schulferien**: [Schulferien-API.de](https://schulferien-api.de)

## Haftungsausschluss

Dieses Tool dient zur Orientierung. Bitte prüfen Sie die Ergebnisse und konsultieren Sie bei Fragen Ihre Schulleitung oder Personalvertretung.

Die Berechnungen basieren auf:
- 40-Stunden-Woche für 100% Vollzeitstelle
- 30 Tagen gesetzlichem Urlaub
- Gleichverteilung der Mehrarbeit über alle Schultage

Individuelle Regelungen (z.B. Tarifverträge, Teilzeit-Modelle mit abweichenden Stundenanzahlen) können abweichen.

## Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Fehlerbehebung oben
2. Kontrollieren Sie die Browser-Konsole (F12)
3. Testen Sie in einem anderen Browser

## Version

**Version 1.0.0** (Februar 2025)

---

Entwickelt für Lehrkräfte an Schulen in Hessen 🎓
