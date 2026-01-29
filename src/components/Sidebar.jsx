import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MagnifyingGlassIcon, ArrowCounterClockwiseIcon, GearIcon, InfoIcon, XIcon } from "@phosphor-icons/react";
import { DAY_COLUMNS, getLibraryStatus } from "./libraryUtils";

/**
 * Simplifies address by removing city, state, and zip code
 * @param {string} address - Full address string
 * @returns {string} Street address only
 */
function simplifyAddress(address) {
  if (!address) return '';
  // Take only the first part before the comma (street address)
  return address.split(',')[0].trim();
}

/**
 * Formats today's hours for display
 * Replaces ". " with ", " for multi-session days
 * @param {Object} library - Library object with day columns
 * @param {Date} currentTime - Current time (will be converted to EST)
 * @returns {string} Formatted hours string for today
 */
function formatTodayHours(library, currentTime) {
  // Convert to EST
  const estTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dayIndex = estTime.getDay();
  const hoursString = library[DAY_COLUMNS[dayIndex]];

  // Handle closed or empty
  if (!hoursString || hoursString.trim().toLowerCase() === 'closed' || hoursString.trim() === '') {
    return 'Closed Today';
  }

  // Replace ". " with ", " for multi-session display
  return hoursString.replace(/\.\s+/g, ', ');
}

/**
 * Parses CSV text into array of library objects
 * @param {string} csvText - Raw CSV file content
 * @returns {Array<Object>} Array of library objects with named properties
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header row to get column names
  const headers = parseCSVLine(lines[0]);
  const libraries = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const library = {};
    headers.forEach((header, index) => {
      library[header] = values[index] || '';
    });
    libraries.push(library);
  }

  return libraries;
}

/**
 * Parses a single CSV line, handling quoted fields
 * @param {string} line - Single CSV line
 * @returns {Array<string>} Array of field values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

export default function Sidebar({ onLibraryClick }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [libraries, setLibraries] = useState([]);
  const [coords, setCoords] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sortBy, setSortBy] = useState('distance');

  // Update time every second
  useEffect(() => {
    const intervalID = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalID);
  }, []);

  // Load libraries CSV on mount
  useEffect(() => {
    fetch('/libraries.csv')
      .then(res => res.text())
      .then(text => {
        const parsed = parseCSV(text);
        setLibraries(parsed);
      })
      .catch(err => console.error('Failed to load libraries:', err));
  }, []);

  // Load library coordinates on mount
  useEffect(() => {
    fetch('/library-coords.json')
      .then(res => res.json())
      .then(data => setCoords(data))
      .catch(err => console.error('Failed to load library coordinates:', err));
  }, []);

  const handleEntryClick = (library) => {
    const libCoords = coords[library.Id];
    if (libCoords && onLibraryClick) {
      onLibraryClick(library, libCoords.lat, libCoords.lng);
    }
  };

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });

  const [time, period] = timeString.split(' ');
  const [hours, minutes] = time.split(':');

  const dateString = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York'
  }).toUpperCase().replace(',', '');

  // Filter and sort libraries based on search query and status filter
  const filteredLibraries = useMemo(() => {
    let result = libraries;

    // Apply search filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(lib => {
        const name = (lib.Name || '').toLowerCase();
        const address = (lib.Address || '').toLowerCase();
        return name.includes(query) || address.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter(lib => getLibraryStatus(lib, currentTime) === statusFilter);
    }

    // Sort by name relevance if searching
    if (query) {
      result = [...result].sort((a, b) => {
        const aName = (a.Name || '').toLowerCase();
        const bName = (b.Name || '').toLowerCase();
        const aNameMatch = aName.includes(query);
        const bNameMatch = bName.includes(query);

        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return aName.localeCompare(bName);
      });
    }

    return result;
  }, [libraries, searchQuery, statusFilter, currentTime]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Harvard Libraries</h3>
        <h5>{dateString} · {hours}<span className="colon">:</span>{minutes} {period}</h5>
      </div>
      <div className="search-container">
        <MagnifyingGlassIcon size={16} weight="regular" className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search libraries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="library-list">
        {filteredLibraries.map((lib, index) => {
          const status = getLibraryStatus(lib, currentTime);
          return (
            <div key={index} className="library-entry" onClick={() => handleEntryClick(lib)}>
              <div className="library-info">
                <span className="library-name">{lib.Name}</span>
                <span className="library-address">{formatTodayHours(lib, currentTime)} · {simplifyAddress(lib.Address)}</span>
              </div>
              <div className={`status-indicator status-${status}`}>
                <span className="status-dot"></span>
              </div>
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="settings-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="settings-row-top">
              <span className="settings-label">Settings</span>
              <button className="close-button" onClick={() => setSettingsOpen(false)}>
                <XIcon size={14} weight="light" />
              </button>
            </div>
            <div className="settings-row-bottom">
              <span className="sort-label">Sort by</span>
              <div className="sort-options">
                <label className="radio-option" onClick={() => setSortBy('distance')}>
                  <span className={`radio-box ${sortBy === 'distance' ? 'selected' : ''}`}>
                    <span className="radio-fill"></span>
                  </span>
                  <span className="radio-label">Distance to me</span>
                </label>
                <label className="radio-option" onClick={() => setSortBy('open')}>
                  <span className={`radio-box ${sortBy === 'open' ? 'selected' : ''}`}>
                    <span className="radio-fill"></span>
                  </span>
                  <span className="radio-label">Open now</span>
                </label>
                <label className="radio-option" onClick={() => setSortBy('alphabetical')}>
                  <span className={`radio-box ${sortBy === 'alphabetical' ? 'selected' : ''}`}>
                    <span className="radio-fill"></span>
                  </span>
                  <span className="radio-label">Alphabetical</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="sidebar-footer">
        <div className="footer-left">
          <button className="settings-button" onClick={() => setSettingsOpen(!settingsOpen)}>
            <GearIcon size={16} weight="regular" />
          </button>
        </div>
        <div className="footer-right">
          {statusFilter && (
            <button className="reset-button" onClick={() => setStatusFilter(null)}>
              <ArrowCounterClockwiseIcon size={14} weight="regular" />
            </button>
          )}
          <div className="legend">
            <button
              className={`legend-item ${statusFilter === 'open' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'open' ? null : 'open')}
            >
              <span className="legend-dot legend-dot-open"></span>
              <span className="legend-label">Open</span>
            </button>
            <button
              className={`legend-item ${statusFilter === 'closing' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'closing' ? null : 'closing')}
            >
              <span className="legend-dot legend-dot-closing"></span>
              <span className="legend-label">Closing Soon</span>
            </button>
            <button
              className={`legend-item ${statusFilter === 'closed' ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'closed' ? null : 'closed')}
            >
              <span className="legend-dot legend-dot-closed"></span>
              <span className="legend-label">Closed</span>
            </button>
          </div>
          <button className="info-button">
            <InfoIcon size={14} weight="regular" />
          </button>
        </div>
      </div>
    </div>
  );
}