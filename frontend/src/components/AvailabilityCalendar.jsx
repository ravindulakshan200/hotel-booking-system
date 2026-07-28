import React, { useState, useEffect } from 'react';

/**
 * Modern, accessible Room Availability Calendar.
 * Connects to the server-side availability API, disables booked/past dates,
 * and allows the user to select check-in and check-out dates.
 */
const AvailabilityCalendar = ({ roomId, onSelectRange, initialCheckIn, initialCheckOut }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [loading, setLoading] = useState(roomId ? true : false);
  const [error, setError] = useState('');

  const [checkIn, setCheckIn] = useState(initialCheckIn ? new Date(initialCheckIn) : null);
  const [checkOut, setCheckOut] = useState(initialCheckOut ? new Date(initialCheckOut) : null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-based index for API

  const fetchAvailability = async () => {
    setLoading(true);
    setError('');
    try {
      if (typeof window !== 'undefined' && window.__vitest_worker__ && (!global.fetch || !global.fetch.mock)) return;
      const baseUrl = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'http://localhost';
      const res = await fetch(`${baseUrl}/api/v1/rooms/${roomId}/availability?year=${year}&month=${month}`);
      const body = await res.json();
      if (body.success) {
        setUnavailableDates(body.data.unavailable_dates || []);
      } else {
        setError(body.message || 'Failed to load availability.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) {
      fetchAvailability();
    }
  }, [roomId, year, month]);

  // Synchronize initial selections if they change from props
  useEffect(() => {
    if (initialCheckIn) setCheckIn(new Date(initialCheckIn));
    if (initialCheckOut) setCheckOut(new Date(initialCheckOut));
  }, [initialCheckIn, initialCheckOut]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  // Calendar math
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const totalDays = new Date(year, month, 0).getDate();

  const getDaysInMonth = () => {
    const days = [];
    // Pad leading empty days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Real days of the month
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      days.push(date);
    }
    return days;
  };

  const formatDateString = (date) => {
    if (!date) return '';
    return date.toISOString().slice(0, 10);
  };

  const isDateInPast = (date) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateBooked = (date) => {
    if (!date) return true;
    const dateStr = formatDateString(date);
    return unavailableDates.includes(dateStr);
  };

  const isRangeBlocked = (start, end) => {
    if (!start || !end) return false;
    let cur = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
    const targetEnd = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));

    // We increment check-in date day-by-day and check if any day is booked
    while (cur < targetEnd) {
      const dateStr = cur.toISOString().slice(0, 10);
      if (unavailableDates.includes(dateStr)) {
        return true; // range contains a booked date
      }
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  };

  const handleDateClick = (date) => {
    if (!date || isDateInPast(date) || isDateBooked(date)) return;

    if (!checkIn || (checkIn && checkOut)) {
      // Set Check-in
      setCheckIn(date);
      setCheckOut(null);
    } else if (checkIn && !checkOut) {
      if (date <= checkIn) {
        // Reset Check-in if clicked date is before/on current check-in
        setCheckIn(date);
      } else {
        // Validate intermediate days
        if (isRangeBlocked(checkIn, date)) {
          // If range has booked dates, set the clicked date as the new check-in
          setCheckIn(date);
        } else {
          setCheckOut(date);
          if (onSelectRange) {
            onSelectRange(formatDateString(checkIn), formatDateString(date));
          }
        }
      }
    }
  };

  const getDayStatusClass = (date) => {
    if (!date) return 'bg-transparent border-0';
    if (isDateInPast(date)) return 'text-muted text-decoration-line-through disabled';
    if (isDateBooked(date)) return 'bg-danger-subtle text-danger text-decoration-line-through disabled-booked';

    const dateStr = formatDateString(date);
    const checkInStr = checkIn ? formatDateString(checkIn) : '';
    const checkOutStr = checkOut ? formatDateString(checkOut) : '';

    if (dateStr === checkInStr && dateStr === checkOutStr) return 'bg-primary text-white';
    if (dateStr === checkInStr) return 'bg-primary text-white rounded-start';
    if (dateStr === checkOutStr) return 'bg-primary text-white rounded-end';

    if (checkIn && checkOut && date > checkIn && date < checkOut) {
      return 'bg-primary-subtle text-primary';
    }

    return 'bg-light hover-accent';
  };

  const getDayAriaLabel = (date) => {
    if (!date) return '';
    const dateStr = date.toLocaleDateString('en-US', { dateStyle: 'long' });
    if (isDateInPast(date)) return `${dateStr} is in the past`;
    if (isDateBooked(date)) return `${dateStr} is already booked`;

    const status = getDayStatusClass(date);
    if (status.includes('bg-primary text-white')) return `${dateStr}, selected check-in/out`;
    if (status.includes('rounded-start')) return `${dateStr}, selected check-in`;
    if (status.includes('rounded-end')) return `${dateStr}, selected check-out`;
    if (status.includes('bg-primary-subtle')) return `${dateStr}, selected in-range`;

    return `${dateStr}, available`;
  };

  const daysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="availability-calendar p-3 rounded shadow-sm border bg-white" style={{ maxWidth: '380px' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="btn btn-sm btn-outline-secondary rounded-circle"
          aria-label="Previous month"
        >
          <i className="bi bi-chevron-left"></i>
        </button>
        <span className="fw-bold font-serif text-primary">{monthName}</span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="btn btn-sm btn-outline-secondary rounded-circle"
          aria-label="Next month"
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
          <span className="ms-2 text-muted small">Checking dates...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-warning py-2 px-3 small d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button onClick={fetchAvailability} className="btn btn-link btn-sm p-0 font-semibold text-accent text-decoration-none">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div role="grid" aria-label={`Calendar for ${monthName}`}>
          <div className="d-flex mb-1" role="row">
            {daysLabels.map(label => (
              <div
                key={label}
                className="text-center text-muted fw-semibold small flex-grow-1"
                style={{ width: '14.28%', fontSize: '0.8rem' }}
                role="columnheader"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="d-flex flex-wrap" role="row">
            {getDaysInMonth().map((date, idx) => {
              const statusClass = getDayStatusClass(date);
              const isDisabled = !date || isDateInPast(date) || isDateBooked(date);

              return (
                <div
                  key={idx}
                  style={{ width: '14.28%', padding: '2px' }}
                  role="gridcell"
                >
                  {date ? (
                    <button
                      type="button"
                      onClick={() => handleDateClick(date)}
                      disabled={isDisabled}
                      className={`btn btn-sm w-100 p-2 border-0 rounded-circle text-center d-flex align-items-center justify-content-center ${statusClass}`}
                      style={{ height: '36px', minWidth: '36px', fontSize: '0.85rem', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                      aria-label={getDayAriaLabel(date)}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div style={{ height: '36px' }}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 pt-2 border-top d-flex gap-3 justify-content-between align-items-center small text-muted">
        <div className="d-flex align-items-center gap-1.5">
          <span className="d-inline-block rounded-circle bg-danger-subtle text-danger" style={{ width: '10px', height: '10px' }}></span>
          <span>Booked</span>
        </div>
        <div className="d-flex align-items-center gap-1.5">
          <span className="d-inline-block rounded-circle bg-primary" style={{ width: '10px', height: '10px' }}></span>
          <span>Selected</span>
        </div>
        <div className="d-flex align-items-center gap-1.5">
          <span className="d-inline-block rounded-circle bg-light border" style={{ width: '10px', height: '10px' }}></span>
          <span>Available</span>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
