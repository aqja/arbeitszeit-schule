Claude’s Plan
Feiertage als Nicht-Werktage behandeln
Problem
Aktuell:
Werktage = Alle Mo-Fr (z.B. 260 Tage)
Schulfreie Tage = Ferien + Feiertage + flexible Tage
Schultage = Werktage - Schulfreie Tage
Gewünscht:
Werktage = Alle Mo-Fr MINUS Feiertage (wie Wochenende)
Schulfreie Tage = Ferien + flexible Tage
Schultage = Werktage - Schulfreie Tage
Warum das Sinn macht
Ein gesetzlicher Feiertag (z.B. Tag der Arbeit) ist kein Arbeitstag - genau wie Samstag/Sonntag. Er sollte nicht in die Jahresarbeitsstunden eingerechnet werden und nicht durch Mehrarbeit kompensiert werden müssen.
Änderungen
1. Werktage-Berechnung anpassen
Datei: calculator.js, Zeile ~245-272 Aktuell:
const allWorkdays = calculateWorkdays(startDate, endDate);
const totalWorkdays = allWorkdays.length;

const vacationDaysSet = createVacationDaysSet(vacations, startDate, endDate);
const holidayDaysSet = createHolidaysSet(holidays, startDate, endDate);
// ...dann werden Feiertage von Werktagen abgezogen
Neu:
// 1. Alle Mo-Fr ermitteln
const allWeekdays = calculateWorkdays(startDate, endDate);

// 2. Feiertage-Set erstellen
const holidayDaysSet = createHolidaysSet(holidays, startDate, endDate);

// 3. Feiertage von Werktagen abziehen (wie Wochenende)
const allWorkdays = allWeekdays.filter(date => {
    const dateString = formatDateToString(date);
    return !holidayDaysSet.has(dateString);
});
const totalWorkdays = allWorkdays.length;

// 4. Ferien und flexible Tage (ohne Feiertage)
const vacationDaysSet = createVacationDaysSet(vacations, startDate, endDate);
const flexDaysSet = createFlexDaysSet(flexDates, startDate, endDate);
2. Schulfreie-Tage-Logik vereinfachen
Datei: calculator.js, Zeile ~253-271 Neu:
// Schulfreie Tage = NUR Ferien + flexible Tage (Feiertage sind bereits raus)
const nonSchoolDaysSet = new Set();

// Ferientage hinzufügen (nur die, die nicht schon Feiertage sind)
vacationDaysSet.forEach(day => {
    if (!holidayDaysSet.has(day)) {
        nonSchoolDaysSet.add(day);
    }
});

// Flexible Ferientage hinzufügen (nur die, die nicht schon erfasst sind)
flexDaysSet.forEach(day => {
    if (!vacationDaysSet.has(day) && !holidayDaysSet.has(day)) {
        nonSchoolDaysSet.add(day);
    }
});
3. Breakdown-Anzeige korrigieren
Datei: calculator.js, Zeile ~296-303 Die Anzeige muss klarmachen, dass Feiertage NICHT in den Werktagen enthalten sind.
4. UI-Text anpassen
Datei: index.html Beschriftungen ändern:
"Werktage gesamt" → "Arbeitstage gesamt (ohne Feiertage)"
Hinweis hinzufügen: "Feiertage werden wie Wochenenden nicht mitgezählt"
5. README aktualisieren
Datei: README.md Erklärung ergänzen:
Feiertage = wie Wochenende
Werden NICHT in Werktage eingerechnet
Müssen NICHT kompensiert werden
Beispiel-Rechnung (Schuljahr 2025/2026)
Alt (falsch):
Werktage: 261 (alle Mo-Fr)
Feiertage: 10 Tage
Ferien: 71 Tage
Schulfreie Tage: 71 + 10 = 81
Schultage: 261 - 81 = 180
Neu (korrekt):
Alle Mo-Fr: 261
MINUS Feiertage: 10
Werktage: 251 (= Arbeitstage)
Ferien: 71 Tage
Flexible Tage: 0
Schulfreie Tage: 71
Schultage: 251 - 71 = 180
Warum Feiertage möglicherweise nicht eingelesen werden
Zusätzlich prüfen:
API-Response: Gibt die Feiertage-API Daten zurück?
Zeitzone-Problem: Werden Feiertage korrekt in Date-Objekte konvertiert?
Debugging hinzufügen: Console.log für geladene Feiertage
Implementierungsreihenfolge
✅ Werktage-Berechnung: Feiertage abziehen
✅ Schulfreie-Tage-Logik: Nur Ferien + flexible Tage
✅ Klassifizierung anpassen: allWorkdays enthält keine Feiertage mehr
✅ UI-Texte aktualisieren
✅ README aktualisieren
🔍 Debug-Logging für Feiertage-API (temporär)