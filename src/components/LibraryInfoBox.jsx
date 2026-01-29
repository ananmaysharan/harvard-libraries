import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "@phosphor-icons/react";
import { DAY_COLUMNS, getLibraryStatus } from "./libraryUtils";

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats hours string for display in the info box
 * @param {string} hoursString - Raw hours string from CSV
 * @returns {string} Formatted hours or "Closed"
 */
function formatHours(hoursString) {
  if (!hoursString || hoursString.trim().toLowerCase() === 'closed' || hoursString.trim() === '') {
    return 'Closed';
  }
  // Replace ". " with line break for multi-session display
  return hoursString.replace(/\.\s+/g, '\n');
}

/**
 * Gets the status label text
 * @param {'open' | 'closing' | 'closed'} status
 * @returns {string} Display text
 */
function getStatusLabel(status) {
  switch (status) {
    case 'open': return 'Open';
    case 'closing': return 'Closing Soon';
    case 'closed': return 'Closed';
    default: return 'Unknown';
  }
}

/**
 * Creates a Google Maps URL for the given address
 * @param {string} address - Full address string
 * @returns {string} Google Maps search URL
 */
function getGoogleMapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function LibraryInfoBox({ library, onClose }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for status updates
  useEffect(() => {
    const intervalID = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(intervalID);
  }, []);

  // Get current day index in EST
  const estTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const todayIndex = estTime.getDay();

  const status = library ? getLibraryStatus(library, currentTime) : 'closed';

  return (
    <AnimatePresence>
      {library && (
        <motion.div
          className="info-box"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300,
            mass: 0.5
          }}
        >
          <div className="info-box-header">
            <div className="info-box-title">
              <span className="info-box-name">{library.Name}</span>
              {library.Description && (
                <span className="info-box-description">{library.Description}</span>
              )}
            </div>
            <button className="info-box-close" onClick={onClose}>
              <X size={16} weight="light" />
            </button>
          </div>

          <div className="info-box-content">
            <div className="info-row">
              <span className="info-label">Address</span>
              <span className="info-value">
                <a href={getGoogleMapsUrl(library.Address)} target="_blank" rel="noopener noreferrer">
                  {library.Address}
                </a>
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value">
                <span className={`info-status-dot status-${status}`}></span>
                {getStatusLabel(status)}
              </span>
            </div>

            <div className="hours-section">
              <span className="info-label">Hours</span>
              <div className="hours-row">
                {DAY_COLUMNS.map((day, index) => {
                  const hours = library[day];
                  const isClosed = !hours || hours.trim().toLowerCase() === 'closed' || hours.trim() === '';
                  const isToday = index === todayIndex;

                  return (
                    <div
                      key={day}
                      className={`day-column ${isToday ? 'today' : ''}`}
                    >
                      <span className="day-label">{DAY_LABELS[index]}</span>
                      <span className={`day-hours ${isClosed ? 'closed' : ''}`}>
                        {formatHours(hours)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
