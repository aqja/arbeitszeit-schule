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
    vacations: 'https://schulferien-api.de/api/v1/'
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

/**
 * Logging-Konfiguration
 * Setze DEBUG auf false für Produktionsumgebung
 */
const DEBUG_SCRIPT = true;

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
        // Eingabefelder
        schoolYear: document.getElementById('schoolYear'),
        workPercentage: document.getElementById('workPercentage'),
        flexDaysCount: document.getElementById('flexDaysCount'),
        flexDatesContainer: document.getElementById('flexDatesContainer'),
        calculateBtn: document.getElementById('calculateBtn'),

        // Anzeige-Elemente
        loadingIndicator: document.getElementById('loadingIndicator'),
        resultsSection: document.getElementById('resultsSection'),

        // Ergebnisfelder
        periodDisplay: document.getElementById('periodDisplay'),
        workModelDisplay: document.getElementById('workModelDisplay'),
        totalHolidays: document.getElementById('totalHolidays'),
        totalWorkdays: document.getElementById('totalWorkdays'),
        schoolDays: document.getElementById('schoolDays'),
        nonSchoolDays: document.getElementById('nonSchoolDays'),
        nonSchoolDaysBreakdown: document.getElementById('nonSchoolDaysBreakdown'),
        remainingDays: document.getElementById('remainingDays'),
        dailyExtra: document.getElementById('dailyExtra'),
        weeklyHours: document.getElementById('weeklyHours'),
        yearlyHours: document.getElementById('yearlyHours'),

        // Detail-Ansichten
        calendarView: document.getElementById('calendarView'),
        monthlyTableBody: document.getElementById('monthlyTableBody')
    };
}

// ========================================
// Initialisierung
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    updateFlexDatesInputs();
});

/**
 * Richtet alle Event-Listener ein
 */
function setupEventListeners() {
    // Berechnen-Button
    elements.calculateBtn.addEventListener('click', handleCalculate);

    // Flexible Ferientage - Anzahl geändert
    elements.flexDaysCount.addEventListener('change', updateFlexDatesInputs);

    // Enter-Taste zum Berechnen
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCalculate();
        }
    });
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

        return {
            holidays: allHolidays,
            vacations: allVacations
        };
    } catch (error) {
        logScript.error('Error fetching all data:', error);
        throw error;
    }
}

// ========================================
// Berechnungs- und Anzeigelogik
// ========================================

/**
 * Hauptfunktion: Berechnung durchführen
 */
async function handleCalculate() {
    try {
        // Eingabewerte sammeln
        const schoolYear = elements.schoolYear.value;
        const workPercentage = parseFloat(elements.workPercentage.value);
        const flexDaysCount = parseInt(elements.flexDaysCount.value) || 0;

        // Validierung
        if (workPercentage < 1 || workPercentage > 100) {
            alert('Bitte geben Sie einen Wert zwischen 1 und 100 für das Arbeitszeitmodell ein.');
            return;
        }

        // Flexible Ferientage sammeln
        const flexDates = [];
        for (let i = 1; i <= flexDaysCount; i++) {
            const input = document.getElementById(`flexDate${i}`);
            if (input && input.value) {
                flexDates.push(input.value);
            }
        }

        // UI aktualisieren
        showLoading(true);

        // Daten von APIs laden
        const apiData = await fetchAllData(schoolYear);

        // Debug: API-Daten anzeigen
        logScript.debug('=== API-DATEN DEBUG ===');
        logScript.debug('Verarbeitete Feiertage:', apiData.holidays);
        logScript.debug('Rohe Ferien-Daten:', apiData.vacations);

        // Feiertage sind bereits verarbeitet (passiert in fetchAllData)
        const holidays = apiData.holidays;
        const vacations = processVacations(apiData.vacations);

        // Debug: Verarbeitete Daten
        logScript.debug('Verarbeitete Feiertage:', holidays);
        logScript.debug('Verarbeitete Ferien:', vacations);

        // Berechnung durchführen
        const results = calculateWorkingTime({
            schoolYear,
            workPercentage,
            vacations,
            holidays,
            flexDates
        });

        // Ergebnisse anzeigen
        displayResults(results);

        // UI aktualisieren
        showLoading(false);
        elements.resultsSection.style.display = 'block';

        // Sanft zu den Ergebnissen scrollen
        elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        logScript.error('Calculation error:', error);
        alert(`Fehler bei der Berechnung: ${error.message}`);
        showLoading(false);
    }
}

/**
 * Zeigt/versteckt die Ladeanzeige
 * @param {boolean} show - true zum Anzeigen, false zum Verstecken
 */
function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'block' : 'none';
    elements.calculateBtn.disabled = show;
}

/**
 * Zeigt die Berechnungsergebnisse an
 * @param {Object} results - Berechnungsergebnisse
 */
function displayResults(results) {
    // Zeitraum
    elements.periodDisplay.textContent = `${results.period.start} - ${results.period.end}`;

    // Arbeitszeitmodell
    elements.workModelDisplay.textContent =
        `${results.workModel.percentage}% (${results.workModel.weeklyTargetHours}h/Woche)`;

    // Tageszahlen
    elements.totalHolidays.textContent = results.days.holidayCount;
    elements.totalWorkdays.textContent = results.days.totalWorkdays;
    elements.schoolDays.textContent = results.days.schoolDays;
    elements.nonSchoolDays.textContent = results.days.totalNonSchoolDays;

    // Breakdown der schulfreien Tage (ohne Feiertage, die sind bereits raus!)
    elements.nonSchoolDaysBreakdown.textContent =
        `Ferien: ${results.days.vacationDays} | ` +
        `Flexible Tage: ${results.days.flexDaysOnly}`;

    elements.remainingDays.textContent = results.days.remainingFreeDays;

    // Stunden
    elements.dailyExtra.textContent = `${results.hours.dailyExtra}h`;
    elements.weeklyHours.textContent = `${results.workModel.weeklyHoursDuringSchool}h`;
    elements.yearlyHours.textContent = `${results.hours.yearlyTarget}h`;

    // Detailansichten
    displayCalendar(results.details.dayClassification);
    displayMonthlyTable(results.details.monthlyBreakdown, results.workModel);
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
// Fehlerbehandlung
// ========================================

window.addEventListener('error', (event) => {
    logScript.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    logScript.error('Unhandled promise rejection:', event.reason);
});
