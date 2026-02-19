/**
 * calculator.js
 * Berechnungslogik für Arbeitszeit-Rechner
 *
 * Dieses Modul enthält alle Funktionen zur Berechnung der Arbeitszeitverteilung
 * für Mitarbeitende an Schulen in Hessen.
 *
 * HINWEIS: Gemeinsame Hilfsfunktionen befinden sich in utils.js
 */

// ========================================
// Konfigurationskonstanten
// ========================================

/**
 * Arbeitszeitkonfiguration für Vollzeit (100%)
 */
const WORK_TIME_CONFIG = {
    WEEKLY_HOURS_FULL_TIME: 39,      // Wöchentliche Arbeitszeit bei Vollzeit
    DAILY_HOURS_FULL_TIME: 7.8,      // Tägliche Arbeitszeit bei Vollzeit
    LEGAL_VACATION_DAYS: 30          // Gesetzliche Urlaubstage pro Jahr
};

/**
 * Logging-Konfiguration
 * Setze DEBUG auf false für Produktionsumgebung
 */
const DEBUG = false;

/**
 * Strukturiertes Logging-System
 */
const log = {
    debug: (...args) => DEBUG && console.log('[DEBUG]', ...args),
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
};

// Alle Hilfsfunktionen für Datumsverarbeitung befinden sich jetzt in utils.js

// ========================================
// Schuljahr-Funktionen
// ========================================

/**
 * Gibt Start- und Enddatum für ein Schuljahr zurück
 * @param {string} schoolYear - Schuljahr im Format "2024-2025"
 * @returns {Object} - Objekt mit startDate und endDate
 */
function getSchoolYearDates(schoolYear) {
    const [startYear, endYear] = schoolYear.split('-').map(Number);

    // Enddatum auf 23:59:59.999 setzen, um den gesamten Tag zu erfassen
    const endDate = new Date(endYear, 6, 31);
    endDate.setHours(23, 59, 59, 999);

    return {
        startDate: new Date(startYear, 7, 1), // 1. August (Monat 7 = August, da 0-basiert)
        endDate: endDate,                     // 31. Juli 23:59:59.999
        displayStart: `01.08.${startYear}`,
        displayEnd: `31.07.${endYear}`
    };
}

/**
 * Berechnet alle Werktage im Schuljahr
 * @param {Date} startDate - Startdatum
 * @param {Date} endDate - Enddatum
 * @returns {Array<Date>} - Array aller Werktage
 */
function calculateWorkdays(startDate, endDate) {
    const allDates = getDateRange(startDate, endDate);
    return allDates.filter(date => isWeekday(date));
}

// ========================================
// Ferien- und Feiertagsverarbeitung
// ========================================

/**
 * Konvertiert API-Feriendaten in nutzbare Date-Objekte
 * @param {Array} vacationsData - Rohdaten von der Schulferien-API
 * @returns {Array<Object>} - Array mit start, end, name für jede Ferienperiode
 */
function processVacations(vacationsData) {
    if (!vacationsData || !Array.isArray(vacationsData)) {
        return [];
    }

    return vacationsData.map(vacation => {
        // ISO 8601 Strings mit explizitem Mittag-Zeitstempel für korrekte Zeitzonenbehandlung
        const startDate = new Date(vacation.start);
        startDate.setHours(12, 0, 0, 0);

        const endDate = new Date(vacation.end);
        endDate.setHours(12, 0, 0, 0);

        return {
            start: startDate,
            end: endDate,
            name: vacation.name || 'Ferien'
        };
    });
}

/**
 * Konvertiert API-Feiertagsdaten in nutzbare Date-Objekte
 * @param {Object} holidaysData - Rohdaten von der Feiertage-API
 * @returns {Array<Object>} - Array mit date, name für jeden Feiertag
 */
function processHolidays(holidaysData) {
    if (!holidaysData || typeof holidaysData !== 'object') {
        return [];
    }

    const holidays = [];
    const years = new Set(); // Sammle alle Jahre für zusätzliche Feiertage

    for (const [name, holidayInfo] of Object.entries(holidaysData)) {
        // Die API gibt Objekte mit {datum: "YYYY-MM-DD", hinweis: "..."} zurück
        const dateString = typeof holidayInfo === 'string' ? holidayInfo : holidayInfo.datum;

        if (!dateString) {
            log.warn(`Feiertag "${name}" hat kein gültiges Datum:`, holidayInfo);
            continue;
        }

        // Datum mit explizitem Mittag-Zeitstempel für korrekte Zeitzonenbehandlung
        const date = new Date(dateString + 'T12:00:00');
        years.add(date.getFullYear()); // Jahr merken

        holidays.push({
            date: date,
            name: name
        });
    }

    // Zusätzliche Feiertage hinzufügen: 24.12. (Heiligabend) und 31.12. (Silvester)
    years.forEach(year => {
        // 24.12. - Heiligabend
        const heiligabend = new Date(`${year}-12-24T12:00:00`);
        holidays.push({
            date: heiligabend,
            name: 'Heiligabend'
        });

        // 31.12. - Silvester
        const silvester = new Date(`${year}-12-31T12:00:00`);
        holidays.push({
            date: silvester,
            name: 'Silvester'
        });
    });

    log.debug(`processHolidays: ${holidays.length} Feiertage verarbeitet (inkl. Heiligabend & Silvester)`);
    return holidays;
}

/**
 * Erstellt ein Set aller Ferientage (für schnelle Lookups)
 * @param {Array} vacations - Verarbeitete Feriendaten
 * @param {Date} startDate - Startdatum des Schuljahres
 * @param {Date} endDate - Enddatum des Schuljahres
 * @returns {Set<string>} - Set mit Datums-Strings (YYYY-MM-DD)
 */
function createVacationDaysSet(vacations, startDate, endDate) {
    const vacationDays = new Set();

    vacations.forEach(vacation => {
        const dates = getDateRange(vacation.start, vacation.end);
        dates.forEach(date => {
            // Nur Werktage innerhalb des Schuljahres zählen
            if (isWeekday(date) && date >= startDate && date <= endDate) {
                vacationDays.add(formatDateToString(date));
            }
        });
    });

    return vacationDays;
}

/**
 * Erstellt ein Set aller Feiertage (für schnelle Lookups)
 * @param {Array} holidays - Verarbeitete Feiertagsdaten
 * @param {Date} startDate - Startdatum des Schuljahres
 * @param {Date} endDate - Enddatum des Schuljahres
 * @returns {Set<string>} - Set mit Datums-Strings (YYYY-MM-DD)
 */
function createHolidaysSet(holidays, startDate, endDate) {
    const holidayDays = new Set();

    holidays.forEach(holiday => {
        // Nur Werktage innerhalb des Schuljahres zählen
        if (isWeekday(holiday.date) && holiday.date >= startDate && holiday.date <= endDate) {
            holidayDays.add(formatDateToString(holiday.date));
        }
    });

    return holidayDays;
}

/**
 * Erstellt ein Set aller flexiblen Ferientage
 * @param {Array<string>} flexDates - Array mit Datums-Strings (YYYY-MM-DD)
 * @param {Date} startDate - Startdatum des Schuljahres
 * @param {Date} endDate - Enddatum des Schuljahres
 * @returns {Set<string>} - Set mit Datums-Strings
 */
function createFlexDaysSet(flexDates, startDate, endDate) {
    const flexDays = new Set();

    flexDates.forEach(dateString => {
        if (dateString) {
            const date = new Date(dateString + 'T12:00:00'); // Mittags, um Zeitzonenfehler zu vermeiden
            // Nur Werktage innerhalb des Schuljahres zählen
            if (isWeekday(date) && date >= startDate && date <= endDate) {
                flexDays.add(formatDateToString(date));
            }
        }
    });

    return flexDays;
}

/**
 * Erstellt eine Map für schnelle Ferienperioden-Lookups
 * PERFORMANCE-OPTIMIERUNG: O(1) Lookup statt O(n²)
 * @param {Array} vacations - Verarbeitete Feriendaten
 * @returns {Map<string, Object>} - Map mit Datums-String als Key, Ferienperiode als Value
 */
function createVacationLookupMap(vacations) {
    const vacationMap = new Map();

    vacations.forEach(vacation => {
        const dates = getDateRange(vacation.start, vacation.end);
        dates.forEach(date => {
            const dateString = formatDateToString(date);
            vacationMap.set(dateString, vacation);
        });
    });

    return vacationMap;
}

// ========================================
// Hauptberechnungen
// ========================================

/**
 * Hauptfunktion zur Berechnung aller Arbeitszeitwerte
 * @param {Object} params - Parameter für die Berechnung
 * @returns {Object} - Objekt mit allen Berechnungsergebnissen
 */
function calculateWorkingTime(params) {
    const {
        schoolYear,
        workPercentage,
        vacations,
        holidays,
        flexDates,
        selectedVacationDays
    } = params;

    // Schuljahrdaten ermitteln
    const { startDate, endDate, displayStart, displayEnd } = getSchoolYearDates(schoolYear);

    // 1. Alle Wochentage (Mo-Fr) berechnen
    const allWeekdays = calculateWorkdays(startDate, endDate);

    // 2. Sets und Maps für schnelle Lookups erstellen
    const holidayDaysSet = createHolidaysSet(holidays, startDate, endDate);
    const vacationDaysSet = createVacationDaysSet(vacations, startDate, endDate);
    const flexDaysSet = createFlexDaysSet(flexDates, startDate, endDate);
    const vacationLookupMap = createVacationLookupMap(vacations); // O(1) Lookup Map

    // 3. Feiertage von Werktagen abziehen (wie Wochenende behandeln)
    const allWorkdays = allWeekdays.filter(date => {
        const dateString = formatDateToString(date);
        return !holidayDaysSet.has(dateString);
    });
    const totalWorkdays = allWorkdays.length;

    // 4. Schulfreie Tage = NUR Ferien + flexible Tage (Feiertage sind bereits aus Werktagen raus!)
    const nonSchoolDaysSet = new Set();

    // Ferientage hinzufügen (die nicht schon Feiertage sind, da diese ja bereits abgezogen wurden)
    vacationDaysSet.forEach(day => {
        if (!holidayDaysSet.has(day)) {
            nonSchoolDaysSet.add(day);
        }
    });

    // Flexible Ferientage hinzufügen (die nicht schon erfasst sind)
    flexDaysSet.forEach(day => {
        if (!vacationDaysSet.has(day) && !holidayDaysSet.has(day)) {
            nonSchoolDaysSet.add(day);
        }
    });

    // Debug-Logging
    log.debug('=== ARBEITSZEIT-RECHNER DEBUG ===');
    log.debug('Alle Wochentage (Mo-Fr):', allWeekdays.length);
    log.debug('Feiertage (Werktage):', holidayDaysSet.size);
    log.debug('Werktage NACH Abzug Feiertage:', totalWorkdays);
    log.debug('Ferientage:', vacationDaysSet.size);
    log.debug('Flexible Ferientage:', flexDaysSet.size);
    log.debug('Feiertage-Liste:', Array.from(holidayDaysSet));

    // Anzahlen berechnen
    const totalNonSchoolDays = nonSchoolDaysSet.size;
    const totalSchoolDays = totalWorkdays - totalNonSchoolDays;

    // Breakdown für Anzeige (Feiertage werden separat angezeigt)
    const vacationCount = Array.from(vacationDaysSet).filter(day => !holidayDaysSet.has(day)).length;
    const holidayCount = holidayDaysSet.size;
    const flexOnlyCount = Array.from(flexDaysSet).filter(day =>
        !vacationDaysSet.has(day) && !holidayDaysSet.has(day)
    ).length;

    // Gesetzlicher Urlaub
    const legalVacationDays = WORK_TIME_CONFIG.LEGAL_VACATION_DAYS;

    // Verbleibende freie Tage für Überstundenabbau
    const remainingFreeDays = Math.max(0, totalNonSchoolDays - legalVacationDays);

    // Wöchentliche Sollarbeitszeit (39h für 100% Vollzeit)
    const weeklyTargetHours = WORK_TIME_CONFIG.WEEKLY_HOURS_FULL_TIME * (workPercentage / 100);

    // Jahressollstunden (Werktage ÷ 5 × Wochenstunden)
    const yearlyTargetHours = (totalWorkdays / 5) * weeklyTargetHours;

    // Tägliche Sollarbeitszeit (abhängig vom Arbeitszeitmodell)
    const dailyTargetHours = WORK_TIME_CONFIG.DAILY_HOURS_FULL_TIME * (workPercentage / 100);

    // Stunden, die durch freie Tage "vorgearbeitet" werden müssen
    // Bei Teilzeit zählt jeder freie Tag entsprechend weniger Stunden
    const hoursToCompensate = remainingFreeDays * dailyTargetHours;

    // Tägliche Mehrarbeit während der Schultage
    const dailyExtraHours = totalSchoolDays > 0 ? hoursToCompensate / totalSchoolDays : 0;

    // Tatsächliche tägliche Arbeitszeit während Schultagen
    const dailyHoursDuringSchool = (weeklyTargetHours / 5) + dailyExtraHours;

    // Wöchentliche Arbeitszeit während der Schulzeit
    const weeklyHoursDuringSchool = dailyHoursDuringSchool * 5;

    // Detaillierte Tagesklassifikation für Kalenderansicht
    const dayClassification = classifyAllDays(
        allWeekdays,  // Alle Wochentage inkl. Feiertage, damit diese im Kalender angezeigt werden
        vacationDaysSet,
        holidayDaysSet,
        flexDaysSet,
        vacationLookupMap,
        holidays
    );

    // Monatliche Aufschlüsselung
    const monthlyBreakdown = calculateMonthlyBreakdown(
        startDate,
        endDate,
        dayClassification,
        weeklyTargetHours,
        dailyExtraHours,
        dailyTargetHours,
        selectedVacationDays
    );

    return {
        period: {
            start: displayStart,
            end: displayEnd,
            startDate,
            endDate
        },
        workModel: {
            percentage: workPercentage,
            weeklyTargetHours: weeklyTargetHours.toFixed(1),
            weeklyHoursDuringSchool: weeklyHoursDuringSchool.toFixed(1)
        },
        days: {
            totalWorkdays,
            totalWeekdays: allWeekdays.length,
            holidayCount: holidayCount,
            schoolDays: totalSchoolDays,
            nonSchoolDays: totalNonSchoolDays,
            vacationDays: vacationCount,
            flexDaysOnly: flexOnlyCount,
            legalVacation: legalVacationDays,
            remainingFreeDays
        },
        hours: {
            yearlyTarget: yearlyTargetHours.toFixed(0),
            dailyExtra: dailyExtraHours.toFixed(2),
            dailyTarget: dailyTargetHours.toFixed(2),
            dailyDuringSchool: dailyHoursDuringSchool.toFixed(2),
            hoursToCompensate: hoursToCompensate.toFixed(0),
            yearlyActualPlan: (totalSchoolDays * dailyHoursDuringSchool).toFixed(0)
        },
        details: {
            dayClassification,
            monthlyBreakdown
        }
    };
}

/**
 * Klassifiziert jeden Tag für die Kalenderansicht
 * OPTIMIERT: Verwendet Map für O(1) Lookups statt O(n²)
 * @param {Array<Date>} workdays - Alle Werktage
 * @param {Set} vacationDaysSet - Set der Ferientage
 * @param {Set} holidayDaysSet - Set der Feiertage
 * @param {Set} flexDaysSet - Set der flexiblen Ferientage
 * @param {Map} vacationLookupMap - Map für schnelle Ferienperioden-Lookups
 * @param {Array} holidays - Feiertagsdaten mit Namen
 * @returns {Array<Object>} - Array mit Klassifikation für jeden Tag
 */
function classifyAllDays(workdays, vacationDaysSet, holidayDaysSet, flexDaysSet, vacationLookupMap, holidays) {
    return workdays.map(date => {
        const dateString = formatDateToString(date);

        let type = 'school';
        let name = 'Schultag';
        let isHoliday = false;
        let holidayName = null;

        // Prüfe ob Feiertag (für spätere Anzeige, auch wenn in Ferien)
        if (holidayDaysSet.has(dateString)) {
            isHoliday = true;
            const holiday = holidays.find(h => formatDateToString(h.date) === dateString);
            holidayName = holiday ? holiday.name : 'Feiertag';
        }

        // Priorität: vacation > holiday > flex > school
        // Dies entspricht der Logik in der Hauptberechnung
        if (vacationDaysSet.has(dateString)) {
            type = 'vacation';
            // OPTIMIERT: O(1) Map-Lookup statt O(n²) find + getDateRange
            const vacation = vacationLookupMap.get(dateString);
            name = vacation ? vacation.name : 'Ferien';
            // Wenn Feiertag in Ferien, ergänze den Namen
            if (isHoliday) {
                name = `${name} (${holidayName})`;
            }
        } else if (holidayDaysSet.has(dateString)) {
            type = 'holiday';
            name = holidayName;
        } else if (flexDaysSet.has(dateString)) {
            type = 'flex';
            name = 'Flexibler Ferientag';
        }

        return {
            date,
            dateString,
            type,
            name,
            isHoliday,  // Flag für Feiertage (auch in Ferien)
            isVacation: vacationDaysSet.has(dateString),  // Flag für Ferientage
            isFlex: flexDaysSet.has(dateString)  // Flag für flexible Tage
        };
    });
}

/**
 * Berechnet monatliche Aufschlüsselung
 * @param {Date} startDate - Startdatum des Schuljahrs
 * @param {Date} endDate - Enddatum des Schuljahrs
 * @param {Array} dayClassification - Klassifikation aller Tage
 * @param {number} weeklyTargetHours - Wöchentliche Sollstunden
 * @param {number} dailyExtraHours - Tägliche Mehrarbeit
 * @param {number} dailyTargetHours - Tägliche Sollstunden (ohne Mehrarbeit)
 * @param {Set<string>} selectedVacationDays - Ausgewählte Urlaubstage (YYYY-MM-DD)
 * @returns {Array<Object>} - Monatliche Statistiken
 */
function calculateMonthlyBreakdown(startDate, endDate, dayClassification, weeklyTargetHours, dailyExtraHours, dailyTargetHours, selectedVacationDays) {
    const months = [];
    const currentDate = new Date(startDate);

    // Schuljahr läuft von August bis Juli
    const monthOrder = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6]; // August = 7, ..., Juli = 6

    monthOrder.forEach(monthIndex => {
        const monthStart = new Date(
            monthIndex < 7 ? startDate.getFullYear() + 1 : startDate.getFullYear(),
            monthIndex,
            1
        );
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

        const daysInMonth = dayClassification.filter(day => {
            const dayYear = day.date.getFullYear();
            const dayMonth = day.date.getMonth();
            const monthYear = monthStart.getFullYear();
            const month = monthStart.getMonth();

            // Vergleiche nur Jahr und Monat
            return dayYear === monthYear && dayMonth === month;
        });

        // Werktage = Tage die KEINE Feiertage sind (Feiertage werden wie Wochenende behandelt)
        // Wichtig: Auch Feiertage in Ferien müssen ausgeschlossen werden (haben type='vacation' aber isHoliday=true)
        const workdays = daysInMonth.filter(d => !d.isHoliday).length;

        // Überspringe Monate ohne Werktage (sollte nicht vorkommen, aber Sicherheitscheck)
        if (workdays === 0) {
            return;
        }

        const schoolDays = daysInMonth.filter(d => d.type === 'school').length;
        const nonSchoolDays = workdays - schoolDays;

        const urlaubstage = selectedVacationDays
            ? daysInMonth.filter(d => selectedVacationDays.has(d.dateString) && !d.isHoliday).length
            : 0;

        const targetHours = (workdays / 5) * weeklyTargetHours;
        const theoreticalWorkHours = schoolDays * (weeklyTargetHours / 5);
        const extraHours = schoolDays * dailyExtraHours;
        const actualPlanHours = theoreticalWorkHours + extraHours;
        const vacationHours = urlaubstage * (dailyTargetHours || weeklyTargetHours / 5);

        months.push({
            name: getMonthName(monthIndex),
            year: monthStart.getFullYear(),
            workdays,
            schoolDays,
            nonSchoolDays,
            urlaubstage,
            targetHours: targetHours.toFixed(1),
            theoreticalWorkHours: theoreticalWorkHours.toFixed(1),
            extraHours: extraHours.toFixed(1),
            actualPlanHours: actualPlanHours.toFixed(1),
            vacationHours: vacationHours.toFixed(1)
        });
    });

    return months;
}

// ========================================
// Export (für Browser-Verwendung)
// ========================================

// Wenn in einem Modul-System verwendet
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateWorkingTime,
        getSchoolYearDates,
        processVacations,
        processHolidays
    };
}
