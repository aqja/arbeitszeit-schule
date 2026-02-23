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

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 Tage á 24 Stunden in Millisekunden

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
 * Ausgewählte Urlaubstage (vom Nutzer im Kalender angeklickt)
 */
let selectedVacationDays = new Set(); // Set<"YYYY-MM-DD">
const MAX_VACATION_DAYS = 30;

/**
 * localStorage-Wrapper mit In-Memory-Fallback.
 * Falls localStorage nicht verfügbar ist (z.B. deaktivierte Cookies/Webseitendaten),
 * werden alle Daten nur für die aktuelle Sitzung im Arbeitsspeicher gehalten.
 */
const storage = (() => {
    const mem = {};
    let available = true;
    try {
        localStorage.setItem('_az_test', '1');
        localStorage.removeItem('_az_test');
    } catch (_) {
        available = false;
    }
    return {
        available,
        getItem: k => {
            if (available) try { return localStorage.getItem(k); } catch (_) {}
            return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
        },
        setItem: (k, v) => {
            if (available) try { localStorage.setItem(k, v); return; } catch (_) {}
            mem[k] = String(v);
        },
        removeItem: k => {
            if (available) try { localStorage.removeItem(k); return; } catch (_) {}
            delete mem[k];
        }
    };
})();

/**
 * Stundenformat ('decimal' = "4,5h" | 'hhmm' = "4:30")
 */
let hourFormat = storage.getItem('arbeitszeit_hourFormat') || 'decimal';

/**
 * Darkmode-Status
 */
let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

const logScript = createLogger(DEBUG_SCRIPT);

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

        // Ergebnisfelder - Teilzeit
        parttimeResults: document.getElementById('parttimeResults'),
        nonSchoolDays2: document.getElementById('nonSchoolDays2'),
        nonSchoolDaysBreakdown2: document.getElementById('nonSchoolDaysBreakdown2'),
        remainingDays: document.getElementById('remainingDays'),
        dailyExtra: document.getElementById('dailyExtra'),
        dailyHours: document.getElementById('dailyHours'),
        weeklyHours: document.getElementById('weeklyHours'),
        yearlyHours: document.getElementById('yearlyHours'),

        // Endergebnis-Kacheln ohne Mehrarbeit
        dailyTargetHoursDisplay: document.getElementById('dailyTargetHoursDisplay'),
        weeklyTargetHoursDisplay: document.getElementById('weeklyTargetHoursDisplay'),

        // Endergebnis-Kacheln mit Mehrarbeit
        yearlyActualPlanHours: document.getElementById('yearlyActualPlanHours'),

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
    applyTheme();
    applyHourFormat();
    loadFormState();
    setupEventListeners();
    handleLoadData();
    if (!storage.available) {
        const btn = document.getElementById('resetDataBtn');
        btn.disabled = true;
        btn.title = 'Datenspeicherung deaktiviert – Aktivieren Sie Website-Daten in den Browser-Einstellungen';
    }
});

// ========================================
// Theme & Stundenformat
// ========================================

/**
 * Wendet das aktuelle Theme an und aktualisiert das Icon
 */
function applyTheme() {
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('iconMoon').style.display = 'none';
        document.getElementById('iconSun').style.display = '';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('iconMoon').style.display = '';
        document.getElementById('iconSun').style.display = 'none';
    }
}

/**
 * Aktualisiert den Format-Button und löst Neudarstellung aus
 */
function applyHourFormat() {
    const btn = document.getElementById('hourFormatBtn');
    btn.textContent = hourFormat === 'decimal' ? '4,5h' : '4:30';
    if (cachedApiData) handleCalculateParttime();
}

// ========================================
// Formular-Persistenz
// ========================================

/**
 * Speichert alle Formulareingaben im localStorage
 */
function saveFormState() {
    const flexDaysCount = parseInt(elements.flexDaysCount.value) || 0;
    const flexDates = [];
    for (let i = 1; i <= flexDaysCount; i++) {
        const inp = document.getElementById(`flexDate${i}`);
        flexDates.push(inp ? inp.value : '');
    }
    const state = {
        schoolYear: elements.schoolYear.value,
        flexDaysCount: elements.flexDaysCount.value,
        flexDates,
        weeklyHoursInput: elements.weeklyHoursInput.value,
        workPercentage: elements.workPercentage.value,
        planner: {
            monStart: elements.monStart.value, monEnd: elements.monEnd.value, monBreak: elements.monBreak.value,
            tueStart: elements.tueStart.value, tueEnd: elements.tueEnd.value, tueBreak: elements.tueBreak.value,
            wedStart: elements.wedStart.value, wedEnd: elements.wedEnd.value, wedBreak: elements.wedBreak.value,
            thuStart: elements.thuStart.value, thuEnd: elements.thuEnd.value, thuBreak: elements.thuBreak.value,
            friStart: elements.friStart.value, friEnd: elements.friEnd.value, friBreak: elements.friBreak.value,
        }
    };
    storage.setItem('arbeitszeit_formState', JSON.stringify(state));
}

/**
 * Lädt gespeicherte Formulareingaben aus dem localStorage
 */
function loadFormState() {
    const raw = storage.getItem('arbeitszeit_formState');
    if (!raw) {
        updateFlexDatesInputs(); // Kein gespeicherter State → Defaults anlegen
        return;
    }
    try {
        const state = JSON.parse(raw);
        if (state.schoolYear) elements.schoolYear.value = state.schoolYear;
        if (state.flexDaysCount !== undefined) elements.flexDaysCount.value = state.flexDaysCount;
        updateFlexDatesInputs(); // Erstellt Flex-Inputs mit Defaults
        // Gespeicherte Flex-Daten überschreiben
        (state.flexDates || []).forEach((val, i) => {
            const inp = document.getElementById(`flexDate${i + 1}`);
            if (inp && val) inp.value = val;
        });
        if (state.weeklyHoursInput !== undefined) elements.weeklyHoursInput.value = state.weeklyHoursInput;
        if (state.workPercentage !== undefined) elements.workPercentage.value = state.workPercentage;
        const p = state.planner || {};
        ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
            ['Start', 'End', 'Break'].forEach(field => {
                const key = `${day}${field}`;
                if (p[key] !== undefined) elements[key].value = p[key];
            });
        });
    } catch (e) {
        logScript.warn('loadFormState: Fehler beim Lesen des gespeicherten Zustands', e);
    }
}

/**
 * Setzt alle Eingaben auf Standardwerte zurück und löscht den localStorage-State
 */
function resetAllData() {
    if (!confirm('Alle gespeicherten Eingaben löschen und auf Standardwerte zurücksetzen?')) return;
    storage.removeItem('arbeitszeit_formState');
    storage.removeItem('arbeitszeit_vacationDays');
    selectedVacationDays = new Set();
    updateVacationCounter();
    elements.flexDaysCount.value = '4';
    elements.weeklyHoursInput.value = '39';
    elements.workPercentage.value = '100';
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
        elements[`${day}Start`].value = '';
        elements[`${day}End`].value = '';
        elements[`${day}Break`].value = '30';
    });
    updateFlexDatesInputs();
    handleLoadData();
}

function setupEventListeners() {
    // Header-Controls
    document.getElementById('resetDataBtn').addEventListener('click', resetAllData);
    document.getElementById('hourFormatBtn').addEventListener('click', () => {
        hourFormat = hourFormat === 'decimal' ? 'hhmm' : 'decimal';
        storage.setItem('arbeitszeit_hourFormat', hourFormat);
        applyHourFormat();
    });
    document.getElementById('darkModeBtn').addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        applyTheme();
    });

    // Planner toggle
    elements.plannerToggle.addEventListener('click', togglePlanner);

    // Planner inputs - calculate on change + save
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    weekdays.forEach(day => {
        elements[`${day}Start`].addEventListener('change', () => { updatePlannerCalculations(); saveFormState(); });
        elements[`${day}End`].addEventListener('change', () => { updatePlannerCalculations(); saveFormState(); });
        elements[`${day}Break`].addEventListener('input', () => { updatePlannerCalculations(); saveFormState(); });
    });

    // Flex days count change - update inputs + save + ggf. neu berechnen
    elements.flexDaysCount.addEventListener('change', () => { updateFlexDatesInputs(); saveFormState(); handleLoadData(); });

    // Schuljahr-Wechsel - Flex-Daten neu berechnen + In-Memory-Cache leeren + neu laden
    elements.schoolYear.addEventListener('change', () => {
        cachedApiData = null;
        currentSchoolYear = null;
        updateFlexDatesInputs();
        saveFormState();
        handleLoadData();
    });

    // Bidirektionale Synchronisierung: Stunden ↔ Prozent + automatische Neuberechnung + save
    elements.weeklyHoursInput.addEventListener('input', () => { syncHoursToPercentage(); saveFormState(); });
    elements.workPercentage.addEventListener('input', () => { syncPercentageToHours(); saveFormState(); });

    // Manueller Refresh-Button (leert Cache, ruft API erneut ab)
    document.getElementById('refreshDataBtn').addEventListener('click', () => {
        cachedApiData = null;
        currentSchoolYear = null;
        handleLoadData();
    });

    // Impressum Modal
    const impressumModal = document.getElementById('impressumModal');
    document.getElementById('impressumLink').addEventListener('click', e => {
        e.preventDefault();
        impressumModal.style.display = 'flex';
    });
    document.getElementById('impressumClose').addEventListener('click', () => {
        impressumModal.style.display = 'none';
    });
    impressumModal.addEventListener('click', e => {
        if (e.target === impressumModal) impressumModal.style.display = 'none';
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') impressumModal.style.display = 'none';
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
 * Gibt den letzten Schultag des Schuljahres zurück (letzter Werktag, der kein Feiertag
 * und keine Ferienperiode ist), rückwärts ab 31. Juli des Endjahres.
 * Setzt voraus, dass cachedApiData gesetzt ist.
 * @param {string} schoolYear - z.B. "2024-2025"
 * @returns {string} - Datum als YYYY-MM-DD String
 */
function getLastSchoolDay(schoolYear) {
    const [, endYear] = schoolYear.split('-').map(Number);
    const vacations = processVacations(cachedApiData.vacations);
    const holidayStrings = new Set(cachedApiData.holidays.map(h => formatDateToString(h.date)));

    const candidate = new Date(endYear, 6, 31, 12, 0, 0, 0); // 31. Juli, Mittag
    while (candidate.getFullYear() >= endYear - 1) {
        if (isWeekday(candidate) && !holidayStrings.has(formatDateToString(candidate))) {
            const inVacation = vacations.some(v => candidate >= v.start && candidate <= v.end);
            if (!inVacation) return formatDateToString(candidate);
        }
        candidate.setDate(candidate.getDate() - 1);
    }
    // Sollte nie erreicht werden
    return formatDateToString(new Date(endYear, 6, 31));
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
        } else {
            // Fallback für Felder jenseits der 4 Standard-Defaults:
            // letzter Schultag des Schuljahres (wenn Daten geladen), sonst leer
            input.value = cachedApiData ? getLastSchoolDay(schoolYear) : '';
        }

        input.addEventListener('change', () => { saveFormState(); handleLoadData(); });
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
        const cached = storage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        if (now - timestamp < CACHE_DURATION) {
            logScript.debug(`Cache hit for ${key}`);
            return data;
        } else {
            logScript.debug(`Cache expired for ${key}`);
            storage.removeItem(key);
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
        storage.setItem(key, JSON.stringify(cacheObject));
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
        // Anschließend nach Datum deduplizieren, da processHolidays() Heiligabend/Silvester
        // selbst anfügt und diese bei Schuljahresgrenzen sonst doppelt auftreten könnten.
        const processedHolidaysStart = processHolidays(holidaysStart);
        const processedHolidaysEnd = processHolidays(holidaysEnd);
        const allHolidays = Array.from(
            new Map(
                [...processedHolidaysStart, ...processedHolidaysEnd]
                    .map(h => [formatDateToString(h.date), h])
            ).values()
        );
        logScript.debug('Kombinierte Feiertage (Array, dedupliziert):', allHolidays);
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
    document.getElementById('refreshDataBtn')?.classList.toggle('loading', show);
}

/**
 * Prüft, ob die Mindestangabe (Schuljahr) vorhanden ist, um Daten laden zu können.
 * Flex-Daten müssen nicht vollständig sein – getFlexDates() filtert leere Felder heraus.
 * @returns {boolean}
 */
function isReadyToLoad() {
    return !!elements.schoolYear.value;
}

/**
 * Zeigt eine Fehlermeldung im Warnbanner an
 * @param {string} message - Anzuzeigende Fehlermeldung
 */
function showError(message) {
    const warningEl = document.getElementById('dataWarning');
    warningEl.textContent = message;
    warningEl.style.display = 'block';
}

/**
 * Aktualisiert den Urlaubstage-Zähler in der Legende
 */
function updateVacationCounter() {
    const counter = document.getElementById('vacationCounter');
    if (counter) {
        counter.textContent = `${selectedVacationDays.size}/${MAX_VACATION_DAYS} Urlaubstage`;
    }
}

/**
 * Löst eine Aktualisierung der monatlichen Tabelle aus
 */
function updateMonthlyTable() {
    handleCalculateParttime();
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

    // Erstelle Monatsansichten in einem Fragment, um Reflows zu minimieren
    const fragment = document.createDocumentFragment();

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

            // Urlaubstag-Auswahl: Ferien- und Flex-Tage sind anklickbar
            const isClickable = (day.type === 'vacation' || day.type === 'flex') && !day.isHoliday;
            if (isClickable) {
                classes.push('clickable-vacation');
                if (selectedVacationDays.has(day.dateString)) {
                    classes.push('urlaub');
                }
            }

            dayIndicator.className = classes.join(' ');
            dayIndicator.title = `${formatDateToString(day.date)}: ${day.name}`;

            if (isClickable) {
                dayIndicator.setAttribute('role', 'button');
                dayIndicator.setAttribute('tabindex', '0');

                const toggleVacation = () => {
                    if (selectedVacationDays.has(day.dateString)) {
                        selectedVacationDays.delete(day.dateString);
                        dayIndicator.classList.remove('urlaub');
                    } else if (selectedVacationDays.size < MAX_VACATION_DAYS) {
                        selectedVacationDays.add(day.dateString);
                        dayIndicator.classList.add('urlaub');
                    }
                    updateVacationCounter();
                    updateMonthlyTable();
                    storage.setItem('arbeitszeit_vacationDays', JSON.stringify({
                        schoolYear: currentSchoolYear,
                        days: Array.from(selectedVacationDays)
                    }));
                };

                dayIndicator.addEventListener('click', toggleVacation);
                dayIndicator.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleVacation();
                    }
                });
            }

            monthColumn.appendChild(dayIndicator);
        });

        fragment.appendChild(monthColumn);
    });

    elements.calendarView.appendChild(fragment);
}

/**
 * Zeigt die monatliche Tabelle an
 * @param {Array} monthlyBreakdown - Monatliche Statistiken
 */
function displayMonthlyTable(monthlyBreakdown) {
    const vacationWarning = document.getElementById('vacationWarning');
    const remaining = MAX_VACATION_DAYS - selectedVacationDays.size;
    if (remaining > 0) {
        vacationWarning.textContent = `Hinweis: Es wurden erst ${selectedVacationDays.size} von ${MAX_VACATION_DAYS} Urlaubstagen im Kalender ausgewählt. Noch ${remaining} Tag${remaining === 1 ? '' : 'e'} ausstehend.`;
        vacationWarning.style.display = '';
    } else {
        vacationWarning.style.display = 'none';
    }

    elements.monthlyTableBody.innerHTML = '';

    let totalWorkdays = 0;
    let totalSchoolDays = 0;
    let totalNonSchoolDays = 0;
    let totalUrlaubstage = 0;
    let totalTargetHours = 0;
    let totalTheoreticalWorkHours = 0;
    let totalExtraHours = 0;
    let totalActualPlanHours = 0;
    let totalVacationHours = 0;

    monthlyBreakdown.forEach(month => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td><strong>${month.name} ${month.year}</strong></td>
            <td>${month.workdays}</td>
            <td>${month.schoolDays}</td>
            <td>${month.nonSchoolDays}</td>
            <td>${month.urlaubstage}</td>
            <td>${formatHours(month.targetHours, hourFormat)}</td>
            <td>${formatHours(month.theoreticalWorkHours, hourFormat)}</td>
            <td>${formatHours(month.extraHours, hourFormat)}</td>
            <td>${formatHours(month.actualPlanHours, hourFormat)}</td>
            <td>${formatHours(month.vacationHours, hourFormat)}</td>
        `;

        elements.monthlyTableBody.appendChild(row);

        totalWorkdays += month.workdays;
        totalSchoolDays += month.schoolDays;
        totalNonSchoolDays += month.nonSchoolDays;
        totalUrlaubstage += month.urlaubstage;
        totalTargetHours += parseFloat(month.targetHours);
        totalTheoreticalWorkHours += parseFloat(month.theoreticalWorkHours);
        totalExtraHours += parseFloat(month.extraHours);
        totalActualPlanHours += parseFloat(month.actualPlanHours);
        totalVacationHours += parseFloat(month.vacationHours);
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
        <td>${totalUrlaubstage}</td>
        <td>${formatHours(totalTargetHours, hourFormat)}</td>
        <td>${formatHours(totalTheoreticalWorkHours, hourFormat)}</td>
        <td>${formatHours(totalExtraHours, hourFormat)}</td>
        <td>${formatHours(totalActualPlanHours, hourFormat)}</td>
        <td>${formatHours(totalVacationHours, hourFormat)}</td>
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
            ? formatHours(dailyHours, hourFormat)
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
 * Liest die ausgewählten flexiblen Ferientage aus dem Formular
 * @returns {string[]} Array von Datumsstrings (YYYY-MM-DD)
 */
function getFlexDates() {
    const flexDaysCount = parseInt(elements.flexDaysCount.value) || 0;
    const flexDates = [];
    for (let i = 1; i <= flexDaysCount; i++) {
        const input = document.getElementById(`flexDate${i}`);
        if (input && input.value) {
            flexDates.push(input.value);
        }
    }
    return flexDates;
}

/**
 * Lädt API-Daten für das Schuljahr und stellt gespeicherte Urlaubstage wieder her.
 * Aktualisiert cachedApiData, currentSchoolYear und selectedVacationDays.
 * @param {string} schoolYear
 */
async function loadApiDataForYear(schoolYear) {
    if (cachedApiData && currentSchoolYear === schoolYear) return;

    cachedApiData = await fetchAllData(schoolYear);
    currentSchoolYear = schoolYear;
    selectedVacationDays = new Set();

    try {
        const savedVac = storage.getItem('arbeitszeit_vacationDays');
        if (savedVac) {
            const { schoolYear: sy, days } = JSON.parse(savedVac);
            if (sy === schoolYear && Array.isArray(days)) {
                selectedVacationDays = new Set(days);
            }
        }
    } catch (e) {
        logScript.warn('loadApiDataForYear: Fehler beim Lesen der gespeicherten Urlaubstage', e);
    }

    updateVacationCounter();
}

/**
 * Zeigt API-Warnungen (fehlende Feriendaten) im Warnbanner an oder versteckt ihn.
 */
function updateDataWarning() {
    const warningEl = document.getElementById('dataWarning');
    if (cachedApiData.warnings && cachedApiData.warnings.length > 0) {
        warningEl.textContent = `Achtung: Die Schulferien-API liefert keine Daten für: ${cachedApiData.warnings.join(', ')}. Die Berechnung ist daher unvollständig. Die fehlenden Daten könnten manuell über flexible Ferientage abgebildet werden.`;
        warningEl.style.display = 'block';
    } else {
        warningEl.style.display = 'none';
    }
}

/**
 * Lädt Daten und berechnet 100%-Basisdaten. Wird automatisch ausgelöst
 * sobald alle Pflichtangaben vollständig sind.
 */
async function handleLoadData() {
    if (!isReadyToLoad()) return;
    try {
        const schoolYear = elements.schoolYear.value;

        showLoading(true);
        await loadApiDataForYear(schoolYear);
        updateDataWarning();

        // Felder jenseits der 4 Standard-Defaults: leere Felder jetzt mit
        // letztem Schultag befüllen, da API-Daten nun verfügbar sind
        const defaults = getDefaultFlexDates(schoolYear);
        const flexCount = parseInt(elements.flexDaysCount.value) || 0;
        if (flexCount > defaults.length) {
            const fallback = getLastSchoolDay(schoolYear);
            for (let i = defaults.length + 1; i <= flexCount; i++) {
                const inp = document.getElementById(`flexDate${i}`);
                if (inp && !inp.value) inp.value = fallback;
            }
        }

        const flexDates = getFlexDates();
        const holidays = cachedApiData.holidays;
        const vacations = processVacations(cachedApiData.vacations);

        const baseResults = calculateWorkingTime({
            schoolYear,
            workPercentage: 100,
            vacations,
            holidays,
            flexDates
        });

        displayBaseResults(baseResults);
        elements.baseResults.style.display = 'block';
        handleCalculateParttime();
        showLoading(false);

    } catch (error) {
        logScript.error('Data loading error:', error);
        showError(`Fehler beim Laden der Daten: ${error.message}`);
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

    // Detailansichten
    displayCalendar(results.details.dayClassification);
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

    const flexDates = getFlexDates();

    calculateAndDisplayParttime(holidays, vacations, flexDates, schoolYear, percentage, selectedVacationDays);
}

/**
 * Berechnet und zeigt Teilzeit-Ergebnisse
 */
function calculateAndDisplayParttime(holidays, vacations, flexDates, schoolYear, percentage, vacationDays) {
    const parttimeResults = calculateWorkingTime({
        schoolYear,
        workPercentage: percentage,
        vacations,
        holidays,
        flexDates,
        selectedVacationDays: vacationDays
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
    elements.dailyExtra.textContent = formatHours(results.hours.dailyExtra, hourFormat);
    document.getElementById('vacationDayHours').textContent = `á ${formatHours(results.hours.dailyTarget, hourFormat)} pro Tag`;

    // Endergebnisse ohne Mehrarbeit (blau)
    elements.dailyTargetHoursDisplay.textContent = formatHours(results.hours.dailyTarget, hourFormat);
    elements.weeklyTargetHoursDisplay.textContent = formatHours(results.workModel.weeklyTargetHours, hourFormat);
    elements.yearlyHours.textContent = formatHours(results.hours.yearlyTarget, hourFormat);

    // Endergebnisse mit Mehrarbeit (rot)
    elements.dailyHours.textContent = formatHours(results.hours.dailyDuringSchool, hourFormat);
    elements.weeklyHours.textContent = formatHours(results.workModel.weeklyHoursDuringSchool, hourFormat);
    elements.yearlyActualPlanHours.textContent = formatHours(results.hours.yearlyActualPlan, hourFormat);

    // Monatliche Tabelle mit Teilzeit-Daten befüllen
    displayMonthlyTable(results.details.monthlyBreakdown);
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
