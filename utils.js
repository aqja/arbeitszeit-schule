/**
 * utils.js
 * Gemeinsame Hilfsfunktionen für den Arbeitszeit-Rechner
 *
 * Dieses Modul enthält wiederverwendbare Hilfsfunktionen für Datums-
 * und String-Formatierung, die von calculator.js und script.js verwendet werden.
 */

// ========================================
// Datumsformatierung
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
 * Formatiert ein Datum für die Anzeige
 * @param {Date} date - Zu formatierendes Datum
 * @returns {string} - Formatiertes Datum (DD.MM.YYYY)
 */
function formatDateForDisplay(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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
// Datumsprüfungen
// ========================================

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

// ========================================
// Osterberechnung
// ========================================

/**
 * Berechnet das Datum des Ostersonntags für ein gegebenes Jahr.
 * Verwendet den Anonymous Gregorian Algorithmus (Meeus/Jones/Butcher).
 * @param {number} year - Das Jahr
 * @returns {Date} - Datum des Ostersonntags
 */
function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// ========================================
// Stundenformatierung
// ========================================

/**
 * Formatiert einen Dezimalstundenwert als Zeichenkette.
 * @param {number|string} value - Stundenwert (z.B. 7.8 oder "7.80")
 * @param {'decimal'|'hhmm'} format - Ausgabeformat
 * @returns {string} - Formatierter Wert (z.B. "7,8h" oder "7:48")
 */
function formatHours(value, format) {
    const h = parseFloat(value);
    if (isNaN(h)) return '-';
    if (format === 'hhmm') {
        const totalMins = Math.round(h * 60);
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        return `${hours}:${String(mins).padStart(2, '0')}`;
    }
    // Dezimal mit deutschem Komma, ohne abschließende Nullen
    const str = h.toFixed(2).replace('.', ',').replace(/,?0+$/, '');
    return str + 'h';
}

// ========================================
// Export (für Browser-Verwendung)
// ========================================

// Wenn in einem Modul-System verwendet
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDateToString,
        formatDateForDisplay,
        getMonthName,
        isWeekday,
        isSameDay,
        isDateInRange,
        getDateRange,
        getEasterDate,
        formatHours
    };
}
