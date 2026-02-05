/**
 * calculator.js
 * Berechnungslogik für Arbeitszeit-Rechner
 *
 * Dieses Modul enthält alle Funktionen zur Berechnung der Arbeitszeitverteilung
 * für Lehrkräfte an Schulen in Hessen.
 */

// ========================================
// Hilfsfunktionen für Datumsverarbeitung
// ========================================

/**
 * Konvertiert ein Datum in einen YYYY-MM-DD String
 * @param {Date} date - Das zu formatierende Datum
 * @returns {string} - Datum als YYYY-MM-DD String
 */
function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Prüft, ob ein Datum ein Werktag (Montag-Freitag) ist
 * @param {Date} date - Das zu prüfende Datum
 * @returns {boolean} - true wenn Werktag, false wenn Wochenende
 */
function isWeekday(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6; // 0 = Sonntag, 6 = Samstag
}

/**
 * Prüft, ob zwei Daten am selben Tag liegen
 * @param {Date} date1 - Erstes Datum
 * @param {Date} date2 - Zweites Datum
 * @returns {boolean} - true wenn beide am selben Tag
 */
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Prüft, ob ein Datum in einem Zeitraum liegt
 * @param {Date} date - Das zu prüfende Datum
 * @param {Date} start - Startdatum des Zeitraums
 * @param {Date} end - Enddatum des Zeitraums
 * @returns {boolean} - true wenn Datum im Zeitraum liegt
 */
function isDateInRange(date, start, end) {
    return date >= start && date <= end;
}

/**
 * Erstellt ein Array aller Daten zwischen Start und Ende (inklusiv)
 * @param {Date} startDate - Startdatum
 * @param {Date} endDate - Enddatum
 * @returns {Array<Date>} - Array aller Daten im Zeitraum
 */
function getDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

/**
 * Gibt den Monatsnamen auf Deutsch zurück
 * @param {number} month - Monat (0-11, JavaScript Date Format)
 * @returns {string} - Deutscher Monatsname
 */
function getMonthName(month) {
    const months = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return months[month];
}

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
    for (const [name, dateString] of Object.entries(holidaysData)) {
        // Datum mit explizitem Mittag-Zeitstempel für korrekte Zeitzonenbehandlung
        const date = new Date(dateString + 'T12:00:00');

        holidays.push({
            date: date,
            name: name
        });
    }

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
        flexDates
    } = params;

    // Schuljahrdaten ermitteln
    const { startDate, endDate, displayStart, displayEnd } = getSchoolYearDates(schoolYear);

    // Alle Werktage berechnen
    const allWorkdays = calculateWorkdays(startDate, endDate);
    const totalWorkdays = allWorkdays.length;

    // Sets für schnelle Lookups erstellen
    const vacationDaysSet = createVacationDaysSet(vacations, startDate, endDate);
    const holidayDaysSet = createHolidaysSet(holidays, startDate, endDate);
    const flexDaysSet = createFlexDaysSet(flexDates, startDate, endDate);

    // Schulfreie Tage zählen (ohne Duplikate)
    const nonSchoolDaysSet = new Set();

    // Ferientage hinzufügen
    vacationDaysSet.forEach(day => nonSchoolDaysSet.add(day));

    // Feiertage hinzufügen (die nicht schon Ferientage sind)
    holidayDaysSet.forEach(day => {
        if (!vacationDaysSet.has(day)) {
            nonSchoolDaysSet.add(day);
        }
    });

    // Flexible Ferientage hinzufügen (die nicht schon erfasst sind)
    flexDaysSet.forEach(day => {
        if (!vacationDaysSet.has(day) && !holidayDaysSet.has(day)) {
            nonSchoolDaysSet.add(day);
        }
    });

    // Anzahlen berechnen
    const totalNonSchoolDays = nonSchoolDaysSet.size;
    const totalSchoolDays = totalWorkdays - totalNonSchoolDays;

    // Breakdown für Anzeige
    const vacationCount = vacationDaysSet.size;
    const holidayOnlyCount = Array.from(holidayDaysSet).filter(day => !vacationDaysSet.has(day)).length;
    const flexOnlyCount = Array.from(flexDaysSet).filter(day =>
        !vacationDaysSet.has(day) && !holidayDaysSet.has(day)
    ).length;

    // Gesetzlicher Urlaub
    const legalVacationDays = 30;

    // Verbleibende freie Tage für Überstundenabbau
    const remainingFreeDays = Math.max(0, totalNonSchoolDays - legalVacationDays);

    // Wöchentliche Sollarbeitszeit (39h für 100% Vollzeit)
    const weeklyTargetHours = 39 * (workPercentage / 100);

    // Jahressollstunden (Werktage ÷ 5 × Wochenstunden)
    const yearlyTargetHours = (totalWorkdays / 5) * weeklyTargetHours;

    // Tägliche Sollarbeitszeit (abhängig vom Arbeitszeitmodell)
    const dailyTargetHours = 7.8 * (workPercentage / 100);

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
        allWorkdays,
        vacationDaysSet,
        holidayDaysSet,
        flexDaysSet,
        vacations,
        holidays
    );

    // Monatliche Aufschlüsselung
    const monthlyBreakdown = calculateMonthlyBreakdown(
        startDate,
        endDate,
        dayClassification,
        weeklyTargetHours,
        dailyExtraHours
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
            schoolDays: totalSchoolDays,
            nonSchoolDays: totalNonSchoolDays,
            vacationDays: vacationCount,
            holidaysOnly: holidayOnlyCount,
            flexDaysOnly: flexOnlyCount,
            legalVacation: legalVacationDays,
            remainingFreeDays
        },
        hours: {
            yearlyTarget: yearlyTargetHours.toFixed(0),
            dailyExtra: dailyExtraHours.toFixed(2),
            dailyDuringSchool: dailyHoursDuringSchool.toFixed(2),
            hoursToCompensate: hoursToCompensate.toFixed(0)
        },
        details: {
            dayClassification,
            monthlyBreakdown
        }
    };
}

/**
 * Klassifiziert jeden Tag für die Kalenderansicht
 * @param {Array<Date>} workdays - Alle Werktage
 * @param {Set} vacationDaysSet - Set der Ferientage
 * @param {Set} holidayDaysSet - Set der Feiertage
 * @param {Set} flexDaysSet - Set der flexiblen Ferientage
 * @param {Array} vacations - Feriendaten mit Namen
 * @param {Array} holidays - Feiertagsdaten mit Namen
 * @returns {Array<Object>} - Array mit Klassifikation für jeden Tag
 */
function classifyAllDays(workdays, vacationDaysSet, holidayDaysSet, flexDaysSet, vacations, holidays) {
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
            const vacation = vacations.find(v => {
                const vDates = getDateRange(v.start, v.end);
                return vDates.some(vd => formatDateToString(vd) === dateString);
            });
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
 * @returns {Array<Object>} - Monatliche Statistiken
 */
function calculateMonthlyBreakdown(startDate, endDate, dayClassification, weeklyTargetHours, dailyExtraHours) {
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

        const workdays = daysInMonth.length;

        // Überspringe Monate ohne Werktage (sollte nicht vorkommen, aber Sicherheitscheck)
        if (workdays === 0) {
            return;
        }

        const schoolDays = daysInMonth.filter(d => d.type === 'school').length;
        const nonSchoolDays = workdays - schoolDays;

        const targetHours = (workdays / 5) * weeklyTargetHours;
        const actualHours = (schoolDays * ((weeklyTargetHours / 5) + dailyExtraHours)) +
                           (nonSchoolDays * 0); // An schulfreien Tagen wird nicht gearbeitet

        months.push({
            name: getMonthName(monthIndex),
            year: monthStart.getFullYear(),
            workdays,
            schoolDays,
            nonSchoolDays,
            targetHours: targetHours.toFixed(1),
            actualHours: actualHours.toFixed(1)
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
        processHolidays,
        formatDateToString,
        isWeekday
    };
}
