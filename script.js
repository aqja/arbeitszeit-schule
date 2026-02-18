/**
 * script.js
 * Hauptskript für die Benutzeroberfläche und API-Integration
 *
 * Dieses Modul verbindet die UI mit den APIs und der Berechnungslogik.
 */

// ========================================
// Globale Variablen und Konfiguration
// ========================================

const API_CONFIG = {
    holidays: 'https://feiertage-api.de/api/',
    vacations: 'https://schulferien-api.de/api/v1/',
    minVacationYear: 2022,
    maxVacationYear: 2028
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

/**
 * Logging-Konfiguration
 * Setze DEBUG auf false für Produktionsumgebung
 */
const DEBUG_SCRIPT = true;

/**
 * Globale Variablen für gecachte API-Daten
 */
let cachedApiData = null;
let currentSchoolYear = null;

/**
 * Strukturiertes Logging-System
 */
const logScript = {
    debug: (...args) => DEBUG_SCRIPT && console.log('[DEBUG]', ...args),
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
};

// ========================================
// DOM-Elemente
// ========================================

let elements = {};

function initializeElements() {
    elements = {
        // Planner elements
        plannerToggle: document.getElementById('togglePlanner'),
        plannerContent: document.getElementById('plannerContent'),

        // Planner inputs for each day
        monStart: document.getElementById('monStart'),
        monEnd: document.getElementById('monEnd'),
        monBreak: document.getElementById('monBreak'),
        monHours: document.getElementById('monHours'),
        tueStart: document.getElementById('tueStart'),
        tueEnd: document.getElementById('tueEnd'),
        tueBreak: document.getElementById('tueBreak'),
        tueHours: document.getElementById('tueHours'),
        wedStart: document.getElementById('wedStart'),
        wedEnd: document.getElementById('wedEnd'),
        wedBreak: document.getElementById('wedBreak'),
        wedHours: document.getElementById('wedHours'),
        thuStart: document.getElementById('thuStart'),
        thuEnd: document.getElementById('thuEnd'),
        thuBreak: document.getElementById('thuBreak'),
        thuHours: document.getElementById('thuHours'),
        friStart: document.getElementById('friStart'),
        friEnd: document.getElementById('friEnd'),
        friBreak: document.getElementById('friBreak'),
        friHours: document.getElementById('friHours'),

        // Eingabefelder
        schoolYear: document.getElementById('schoolYear'),
        weeklyHoursInput: document.getElementById('weeklyHoursInput'),
        workPercentage: document.getElementById('workPercentage'),
        flexDaysCount: document.getElementById('flexDaysCount'),
        flexDatesContainer: document.getElementById('flexDatesContainer'),
        loadDataBtn: document.getElementById('loadDataBtn'),

        // Anzeige-Elemente
        loadingIndicator: document.getElementById('loadingIndicator'),
        baseResults: document.getElementById('baseResults'),

        // Ergebnisfelder - Basis (100%)
        periodDisplay: document.getElementById('periodDisplay'),
        totalWeekdays: document.getElementById('totalWeekdays'),
        totalHolidays: document.getElementById('totalHolidays'),
        totalWorkdays: document.getElementById('totalWorkdays'),
        schoolDays: document.getElementById('schoolDays'),
        nonSchoolDays: document.getElementById('nonSchoolDays'),
        nonSchoolDaysBreakdown: document.getElementById('nonSchoolDaysBreakdown'),
        baseWeeklyHours: document.getElementById('baseWeeklyHours'),
        baseYearlyHours: document.getElementById('baseYearlyHours'),

        // Ergebnisfelder - Teilzeit
        parttimeResults: document.getElementById('parttimeResults'),
        nonSchoolDays2: document.getElementById('nonSchoolDays2'),
        nonSchoolDaysBreakdown2: document.getElementById('nonSchoolDaysBreakdown2'),
        remainingDays: document.getElementById('remainingDays'),
        dailyExtra: document.getElementById('dailyExtra'),
        dailyHours: document.getElementById('dailyHours'),
        weeklyHours: document.getElementById('weeklyHours'),
        yearlyHours: document.getElementById('yearlyHours'),

        // Detail-Ansichten
        calendarView: document.getElementById('calendarView'),
        monthlyTableBody: document.getElementById('monthlyTableBody')
    };
}

// ========================================
// Schuljahr-Dropdown Generierung
// ========================================

/**
 * Generiert die Schuljahr-Optionen dynamisch basierend auf API-Verfügbarkeit.
 * Schuljahr YYYY/(YYYY+1) ist verfügbar wenn beide Jahre im API-Bereich liegen.
 * Das aktuelle Schuljahr wird automatisch vorausgewählt.
 */
function populateSchoolYearDropdown() {
    const select = document.getElementById('schoolYear');
    select.innerHTML = '';

    const minStart = API_CONFIG.minVacationYear;
    const maxStart = API_CONFIG.maxVacationYear - 1;

    // Aktuelles Schuljahr bestimmen: Aug-Dez → laufendes Jahr, Jan-Jul → Vorjahr
    const now = new Date();
    const currentStartYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

    for (let startYear = minStart; startYear <= maxStart; startYear++) {
        const endYear = startYear + 1;
        const option = document.createElement('option');
        option.value = `${startYear}-${endYear}`;
        option.textContent = `${startYear}/${endYear}`;

        if (startYear === currentStartYear) {
            option.selected = true;
        }

        select.appendChild(option);
    }
}

// ========================================
// Initialisierung
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    populateSchoolYearDropdown();
    initializeElements();
    setupEventListeners();
    updateFlexDatesInputs();
});

/**
 * Richtet alle Event-Listener ein
 */
function setupEventListeners() {
    // Planner toggle
    elements.plannerToggle.addEventListener('click', togglePlanner);

    // Planner inputs - calculate on change
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    weekdays.forEach(day => {
        elements[`${day}Start`].addEventListener('change', updatePlannerCalculations);
        elements[`${day}End`].addEventListener('change', updatePlannerCalculations);
        elements[`${day}Break`].addEventListener('input', updatePlannerCalculations);
    });

    // Button-triggered data loading
    elements.loadDataBtn.addEventListener('click', handleLoadData);

    // Flex days count change - update inputs only
    elements.flexDaysCount.addEventListener('change', updateFlexDatesInputs);

    // Schuljahr-Wechsel - Flex-Daten neu berechnen
    elements.schoolYear.addEventListener('change', updateFlexDatesInputs);

    // Bidirektionale Synchronisierung: Stunden ↔ Prozent + automatische Neuberechnung
    elements.weeklyHoursInput.addEventListener('input', syncHoursToPercentage);
    elements.workPercentage.addEventListener('input', syncPercentageToHours);

    // Enter-Taste zum Laden
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLoadData();
        }
    });
}

/**
 * Berechnet die Standard-Flex-Daten für ein Schuljahr.
 * @param {string} schoolYear - Schuljahr im Format "YYYY-YYYY"
 * @returns {Array<string>} - Array mit YYYY-MM-DD Strings für die 4 Standard-Tage
 */
function getDefaultFlexDates(schoolYear) {
    const [startYear, endYear] = schoolYear.split('-').map(Number);
    const easter = getEasterDate(endYear);

    // Tag 1: Freitag nach Fronleichnam (Fronleichnam = Ostern + 60, Freitag = +61)
    const fridayAfterCorpusChristi = new Date(easter);
    fridayAfterCorpusChristi.setDate(easter.getDate() + 61);

    // Tag 2: Freitag nach Himmelfahrt (Himmelfahrt = Ostern + 39, Freitag = +40)
    const fridayAfterAscension = new Date(easter);
    fridayAfterAscension.setDate(easter.getDate() + 40);

    // Tag 3: Erster Montag im Februar (Endjahr)
    const firstMondayFeb = new Date(endYear, 1, 1); // 1. Februar
    while (firstMondayFeb.getDay() !== 1) { // 1 = Montag
        firstMondayFeb.setDate(firstMondayFeb.getDate() + 1);
    }

    // Tag 4: Letzter Schultag (Werktag Mo-Fr) im Oktober (Startjahr)
    const lastWeekdayOct = new Date(startYear, 9, 31); // 31. Oktober
    while (!isWeekday(lastWeekdayOct)) {
        lastWeekdayOct.setDate(lastWeekdayOct.getDate() - 1);
    }

    return [
        formatDateToString(fridayAfterCorpusChristi),
        formatDateToString(fridayAfterAscension),
        formatDateToString(firstMondayFeb),
        formatDateToString(lastWeekdayOct)
    ];
}

/**
 * Aktualisiert die Eingabefelder für flexible Ferientage
 */
function updateFlexDatesInputs() {
    const count = parseInt(elements.flexDaysCount.value) || 0;
    elements.flexDatesContainer.innerHTML = '';

    if (count === 0) {
        return;
    }

    const schoolYear = elements.schoolYear.value;
    const defaults = getDefaultFlexDates(schoolYear);

    for (let i = 1; i <= count; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'flex-date-input';

        const label = document.createElement('label');
        label.textContent = `Tag ${i}:`;
        label.setAttribute('for', `flexDate${i}`);

        const input = document.createElement('input');
        input.type = 'date';
        input.id = `flexDate${i}`;
        input.name = `flexDate${i}`;

        if (i <= defaults.length) {
            input.value = defaults[i - 1];
        }

        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        elements.flexDatesContainer.appendChild(inputGroup);
    }
}

// ========================================
// API-Funktionen mit Caching
// ========================================

/**
 * Holt Daten aus dem LocalStorage-Cache
 * @param {string} key - Cache-Schlüssel
 * @returns {Object|null} - Gecachte Daten oder null
 */
function getFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        if (now - timestamp < CACHE_DURATION) {
            logScript.debug(`Cache hit for ${key}`);
            return data;
        } else {
            logScript.debug(`Cache expired for ${key}`);
            localStorage.removeItem(key);
            return null;
        }
    } catch (error) {
        logScript.error('Cache read error:', error);
        return null;
    }
}

/**
 * Speichert Daten im LocalStorage-Cache
 * @param {string} key - Cache-Schlüssel
 * @param {Object} data - Zu cachende Daten
 */
function saveToCache(key, data) {
    try {
        const cacheObject = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheObject));
        logScript.debug(`Cached data for ${key}`);
    } catch (error) {
        logScript.error('Cache write error:', error);
    }
}

/**
 * Lädt Feiertage von der API
 * @param {number} year - Jahr
 * @returns {Promise<Object>} - Feiertagsdaten
 */
async function fetchHolidays(year) {
    const cacheKey = `holidays_HE_${year}`;
    const cached = getFromCache(cacheKey);

    if (cached) {
        logScript.debug(`Feiertage ${year} aus Cache geladen:`, cached);
        return cached;
    }

    try {
        const url = `${API_CONFIG.holidays}?jahr=${year}&nur_land=HE`;
        logScript.info(`Lade Feiertage von: ${url}`);

        const response = await fetch(url);
        logScript.debug(`Feiertage-API Response Status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logScript.debug(`Feiertage ${year} erhalten:`, data);
        saveToCache(cacheKey, data);
        return data;
    } catch (error) {
        logScript.error('Error fetching holidays:', error);
        throw new Error(`Fehler beim Laden der Feiertage: ${error.message}`);
    }
}

/**
 * Lädt Schulferien von der API
 * @param {number} year - Jahr
 * @returns {Promise<Array>} - Schulferiendate
 */
async function fetchVacations(year) {
    const cacheKey = `vacations_HE_${year}`;
    const cached = getFromCache(cacheKey);

    if (cached) {
        return cached;
    }

    try {
        const url = `${API_CONFIG.vacations}${year}/HE/`;
        logScript.info(`Fetching vacations from: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        saveToCache(cacheKey, data);
        return data;
    } catch (error) {
        logScript.error('Error fetching vacations:', error);
        throw new Error(`Fehler beim Laden der Schulferien: ${error.message}`);
    }
}

/**
 * Prüft ob erwartete Ferienperioden in den API-Daten fehlen.
 * Für ein Schuljahr (Aug-Jul) werden erwartet:
 * - Startjahr: Herbstferien, Weihnachtsferien
 * - Endjahr: Osterferien
 */
function checkMissingVacations(vacationsStart, vacationsEnd, startYear, endYear) {
    const warnings = [];
    const namesStart = (vacationsStart || []).map(v => v.name);
    const namesEnd = (vacationsEnd || []).map(v => v.name);

    const expectedStart = [
        { key: 'herbstferien', label: 'Herbstferien' },
        { key: 'weihnachtsferien', label: 'Weihnachtsferien' }
    ];
    const expectedEnd = [
        { key: 'osterferien', label: 'Osterferien' }
    ];

    for (const { key, label } of expectedStart) {
        if (!namesStart.includes(key)) {
            warnings.push(`${label} ${startYear}/${endYear}`);
        }
    }
    for (const { key, label } of expectedEnd) {
        if (!namesEnd.includes(key)) {
            warnings.push(`${label} ${endYear}`);
        }
    }

    if (warnings.length > 0) {
        logScript.warn('Fehlende Ferienperioden:', warnings);
    }
    return warnings;
}

/**
 * Lädt alle benötigten Daten für ein Schuljahr
 * @param {string} schoolYear - Schuljahr (z.B. "2024-2025")
 * @returns {Promise<Object>} - Alle Daten
 */
async function fetchAllData(schoolYear) {
    const [startYear, endYear] = schoolYear.split('-').map(Number);

    logScript.info(`=== LADE DATEN FÜR SCHULJAHR ${schoolYear} ===`);
    logScript.debug(`Startjahr: ${startYear}, Endjahr: ${endYear}`);

    try {
        // Parallele API-Aufrufe für bessere Performance
        const [
            holidaysStart,
            holidaysEnd,
            vacationsStart,
            vacationsEnd
        ] = await Promise.all([
            fetchHolidays(startYear),
            fetchHolidays(endYear),
            fetchVacations(startYear),
            fetchVacations(endYear)
        ]);

        logScript.debug(`Feiertage ${startYear}:`, holidaysStart);
        logScript.debug(`Feiertage ${endYear}:`, holidaysEnd);

        // Feiertage MÜSSEN als Arrays kombiniert werden, da Objekt-Merge gleiche Namen überschreibt
        // (z.B. "Tag der Deutschen Einheit" existiert in beiden Jahren)
        const processedHolidaysStart = processHolidays(holidaysStart);
        const processedHolidaysEnd = processHolidays(holidaysEnd);
        const allHolidays = [...processedHolidaysStart, ...processedHolidaysEnd];
        logScript.debug('Kombinierte Feiertage (Array):', allHolidays);
        logScript.debug('Anzahl Feiertage:', allHolidays.length);

        // Ferien kombinieren
        const allVacations = [...vacationsStart, ...vacationsEnd];
        logScript.debug('Anzahl Ferienperioden:', allVacations.length);

        // Prüfe auf fehlende Ferienperioden
        const warnings = checkMissingVacations(vacationsStart, vacationsEnd, startYear, endYear);

        return {
            holidays: allHolidays,
            vacations: allVacations,
            warnings
        };
    } catch (error) {
        logScript.error('Error fetching all data:', error);
        throw error;
    }
}

// ========================================
// Anzeigelogik
// ========================================

/**
 * Zeigt/versteckt die Ladeanzeige
 * @param {boolean} show - true zum Anzeigen, false zum Verstecken
 */
function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'block' : 'none';
}

/**
 * Zeigt die Kalenderübersicht an
 * @param {Array} dayClassification - Klassifikation aller Tage
 */
function displayCalendar(dayClassification) {
    elements.calendarView.innerHTML = '';

    // Gruppiere Tage nach Monaten
    const monthGroups = {};

    dayClassification.forEach(day => {
        const monthKey = `${day.date.getFullYear()}-${day.date.getMonth()}`;
        if (!monthGroups[monthKey]) {
            monthGroups[monthKey] = {
                month: day.date.getMonth(),
                year: day.date.getFullYear(),
                days: []
            };
        }
        monthGroups[monthKey].days.push(day);
    });

    // Sortiere Monate (August bis Juli)
    const sortedMonths = Object.values(monthGroups).sort((a, b) => {
        // Schuljahr-Reihenfolge: August (7) bis Juli (6)
        const orderA = a.month < 7 ? a.month + 12 : a.month;
        const orderB = b.month < 7 ? b.month + 12 : b.month;
        return orderA - orderB;
    });

    // Erstelle Monatsansichten
    sortedMonths.forEach(monthGroup => {
        const monthColumn = document.createElement('div');
        monthColumn.className = 'month-column';

        const monthName = getMonthName(monthGroup.month);
        const monthHeader = document.createElement('h4');
        monthHeader.textContent = `${monthName} ${monthGroup.year}`;
        monthColumn.appendChild(monthHeader);

        monthGroup.days.forEach(day => {
            const dayIndicator = document.createElement('div');
            // Basis-Klasse plus Flags für visuelle Hervorhebung von Überlappungen
            const classes = [`day-indicator`, day.type];

            // Feiertag in Ferien/Schultag - füge gestreifte Klasse hinzu
            if (day.isHoliday && day.type !== 'holiday') {
                classes.push('has-holiday');
            }

            // Flexibler Tag in Ferien/Schultag - füge gestreifte Klasse hinzu
            if (day.isFlex && day.type !== 'flex') {
                classes.push('has-flex');
            }

            dayIndicator.className = classes.join(' ');
            dayIndicator.title = `${formatDateToString(day.date)}: ${day.name}`;
            monthColumn.appendChild(dayIndicator);
        });

        elements.calendarView.appendChild(monthColumn);
    });
}

/**
 * Zeigt die monatliche Tabelle an
 * @param {Array} monthlyBreakdown - Monatliche Statistiken
 * @param {Object} workModel - Arbeitszeitmodell
 */
function displayMonthlyTable(monthlyBreakdown, workModel) {
    elements.monthlyTableBody.innerHTML = '';

    let totalWorkdays = 0;
    let totalSchoolDays = 0;
    let totalNonSchoolDays = 0;
    let totalTargetHours = 0;
    let totalActualHours = 0;

    monthlyBreakdown.forEach(month => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td><strong>${month.name} ${month.year}</strong></td>
            <td>${month.workdays}</td>
            <td>${month.schoolDays}</td>
            <td>${month.nonSchoolDays}</td>
            <td>${month.targetHours}h</td>
            <td><strong>${month.actualHours}h</strong></td>
        `;

        elements.monthlyTableBody.appendChild(row);

        // Summen berechnen
        totalWorkdays += month.workdays;
        totalSchoolDays += month.schoolDays;
        totalNonSchoolDays += month.nonSchoolDays;
        totalTargetHours += parseFloat(month.targetHours);
        totalActualHours += parseFloat(month.actualHours);
    });

    // Summenzeile hinzufügen
    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = 'bold';
    totalRow.style.backgroundColor = 'var(--bg-tertiary)';
    totalRow.innerHTML = `
        <td>GESAMT</td>
        <td>${totalWorkdays}</td>
        <td>${totalSchoolDays}</td>
        <td>${totalNonSchoolDays}</td>
        <td>${totalTargetHours.toFixed(1)}h</td>
        <td>${totalActualHours.toFixed(1)}h</td>
    `;
    elements.monthlyTableBody.appendChild(totalRow);
}

// ========================================
// Hilfsfunktionen
// ========================================

// Alle Hilfsfunktionen für Datums- und String-Formatierung
// befinden sich jetzt in utils.js

// ========================================
// Arbeitszeitplaner Funktionen
// ========================================

/**
 * Toggles the visibility of the planner section
 */
function togglePlanner() {
    const content = elements.plannerContent;
    const button = elements.plannerToggle;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        button.textContent = '▲ Verbergen';
    } else {
        content.style.display = 'none';
        button.textContent = '▼ Anzeigen';
    }
}

/**
 * Calculates working hours for a single day
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {number} breakMinutes - Break duration in minutes
 * @returns {number} - Working hours for the day
 */
function calculateDailyHours(startTime, endTime, breakMinutes) {
    if (!startTime || !endTime) {
        return 0;
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;

    const workMinutes = endTotalMinutes - startTotalMinutes - (breakMinutes || 0);

    if (workMinutes < 0) {
        return 0;
    }

    return workMinutes / 60;
}

/**
 * Synchronisiert Stunden-Input → Prozent-Input
 */
function syncHoursToPercentage() {
    const hours = parseFloat(elements.weeklyHoursInput.value);
    if (hours > 0 && hours <= WORK_TIME_CONFIG.WEEKLY_HOURS_FULL_TIME) {
        const percentage = (hours / WORK_TIME_CONFIG.WEEKLY_HOURS_FULL_TIME) * 100;
        elements.workPercentage.value = percentage.toFixed(1);
    }
    handleCalculateParttime();
}

/**
 * Synchronisiert Prozent-Input → Stunden-Input
 */
function syncPercentageToHours() {
    const percentage = parseFloat(elements.workPercentage.value);
    if (percentage > 0 && percentage <= 100) {
        const hours = (percentage / 100) * WORK_TIME_CONFIG.WEEKLY_HOURS_FULL_TIME;
        elements.weeklyHoursInput.value = hours.toFixed(1);
    }
    handleCalculateParttime();
}

/**
 * Updates all planner calculations
 */
function updatePlannerCalculations() {
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    let totalWeeklyHours = 0;

    weekdays.forEach(day => {
        const startTime = elements[`${day}Start`].value;
        const endTime = elements[`${day}End`].value;
        const breakMinutes = parseInt(elements[`${day}Break`].value) || 0;

        const dailyHours = calculateDailyHours(startTime, endTime, breakMinutes);
        totalWeeklyHours += dailyHours;

        // Update daily hours display
        elements[`${day}Hours`].textContent = dailyHours > 0
            ? `${dailyHours.toFixed(2)}h`
            : '-';
    });

    // Beide Inputs aktualisieren
    if (totalWeeklyHours > 0) {
        const percentage = (totalWeeklyHours / WORK_TIME_CONFIG.WEEKLY_HOURS_FULL_TIME) * 100;
        elements.weeklyHoursInput.value = totalWeeklyHours.toFixed(1);
        if (percentage <= 100) {
            elements.workPercentage.value = percentage.toFixed(1);
        }
    }
    handleCalculateParttime();
}

// ========================================
// Button-triggered Data Loading
// ========================================

/**
 * Lädt Daten und berechnet 100%-Basisdaten nach Button-Klick
 */
async function handleLoadData() {
    try {
        const schoolYear = elements.schoolYear.value;

        // Flexible Ferientage sammeln
        const flexDaysCount = parseInt(elements.flexDaysCount.value) || 0;
        const flexDates = [];
        for (let i = 1; i <= flexDaysCount; i++) {
            const input = document.getElementById(`flexDate${i}`);
            if (input && input.value) {
                flexDates.push(input.value);
            }
        }

        // Zeige Ladeanzeige
        showLoading(true);

        // API-Daten laden (mit Caching)
        if (!cachedApiData || currentSchoolYear !== schoolYear) {
            cachedApiData = await fetchAllData(schoolYear);
            currentSchoolYear = schoolYear;
        }

        // Warnung bei fehlenden Feriendaten anzeigen
        const warningEl = document.getElementById('dataWarning');
        if (cachedApiData.warnings && cachedApiData.warnings.length > 0) {
            warningEl.textContent = `Achtung: Die Schulferien-API liefert keine Daten für: ${cachedApiData.warnings.join(', ')}. Die Berechnung ist daher unvollständig. Die fehlenden Daten könnten manuell über flexible Ferientage abgebildet werden.`;
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
        }

        const holidays = cachedApiData.holidays;
        const vacations = processVacations(cachedApiData.vacations);

        // Berechnung bei 100% durchführen
        const baseResults = calculateWorkingTime({
            schoolYear,
            workPercentage: 100, // Immer 100% für Basisdaten
            vacations,
            holidays,
            flexDates
        });

        // 100%-Basisdaten anzeigen
        displayBaseResults(baseResults);

        // Basisdaten-Bereich einblenden
        elements.baseResults.style.display = 'block';

        // Teilzeit automatisch berechnen
        handleCalculateParttime();

        showLoading(false);

    } catch (error) {
        logScript.error('Data loading error:', error);
        alert(`Fehler beim Laden der Daten: ${error.message}`);
        showLoading(false);
    }
}

/**
 * Zeigt die 100%-Basisdaten an
 */
function displayBaseResults(results) {
    // Context stage
    elements.periodDisplay.textContent = `${results.period.start} - ${results.period.end}`;

    // Tagesverteilung
    const totalWeekdays = results.days.totalWorkdays + results.days.holidayCount;
    elements.totalWeekdays.textContent = totalWeekdays;
    elements.totalHolidays.textContent = results.days.holidayCount;
    elements.totalWorkdays.textContent = results.days.totalWorkdays;
    elements.schoolDays.textContent = results.days.schoolDays;
    elements.nonSchoolDays.textContent = results.days.nonSchoolDays;
    elements.nonSchoolDaysBreakdown.textContent =
        `Ferien: ${results.days.vacationDays} | Flexible Tage: ${results.days.flexDaysOnly}`;

    // 100%-Arbeitszeit
    elements.baseWeeklyHours.textContent = '39h'; // Immer 39h bei 100%
    elements.baseYearlyHours.textContent = `${results.hours.yearlyTarget}h`;

    // Detailansichten
    displayCalendar(results.details.dayClassification);
    displayMonthlyTable(results.details.monthlyBreakdown, results.workModel);
}

/**
 * Berechnet und zeigt Teilzeit-Ergebnisse automatisch.
 * Wird still übersprungen wenn noch keine Basisdaten geladen sind.
 */
function handleCalculateParttime() {
    if (!cachedApiData) return;

    const percentage = parseFloat(elements.workPercentage.value);
    if (!(percentage > 0 && percentage <= 100)) return;

    const schoolYear = elements.schoolYear.value;
    const holidays = cachedApiData.holidays;
    const vacations = processVacations(cachedApiData.vacations);

    const flexDaysCount = parseInt(elements.flexDaysCount.value) || 0;
    const flexDates = [];
    for (let i = 1; i <= flexDaysCount; i++) {
        const input = document.getElementById(`flexDate${i}`);
        if (input && input.value) {
            flexDates.push(input.value);
        }
    }

    calculateAndDisplayParttime(holidays, vacations, flexDates, schoolYear, percentage);
}

/**
 * Berechnet und zeigt Teilzeit-Ergebnisse
 */
function calculateAndDisplayParttime(holidays, vacations, flexDates, schoolYear, percentage) {
    const parttimeResults = calculateWorkingTime({
        schoolYear,
        workPercentage: percentage,
        vacations,
        holidays,
        flexDates
    });

    displayParttimeResults(parttimeResults);
}

/**
 * Zeigt die Teilzeit-Endergebnisse an
 */
function displayParttimeResults(results) {
    // Stundenberechnung
    elements.nonSchoolDays2.textContent = results.days.nonSchoolDays;
    elements.nonSchoolDaysBreakdown2.textContent = 
        `Ferien: ${results.days.vacationDays} | Flexible Tage: ${results.days.flexDaysOnly}`;
    elements.remainingDays.textContent = results.days.remainingFreeDays;
    elements.dailyExtra.textContent = `${results.hours.dailyExtra}h`;

    // Endergebnisse
    elements.dailyHours.textContent = `${results.hours.dailyDuringSchool}h`;
    elements.weeklyHours.textContent = `${results.workModel.weeklyHoursDuringSchool}h`;
    elements.yearlyHours.textContent = `${results.hours.yearlyTarget}h`;

    // Teilzeit-Bereich einblenden
    elements.parttimeResults.style.display = 'block';
}

// ========================================
// Fehlerbehandlung
// ========================================

window.addEventListener('error', (event) => {
    logScript.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    logScript.error('Unhandled promise rejection:', event.reason);
});
