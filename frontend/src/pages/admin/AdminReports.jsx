/**
 * pages/admin/AdminReports.jsx
 * Admin CSV and PDF Report Download Control Center.
 */

import React, { useState } from 'react';

const AdminReports = () => {
  const [reportType, setReportType] = useState('bookings');
  const [format, setFormat] = useState('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hotelId, setHotelId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate)   params.append('end_date', endDate);
      if (hotelId)   params.append('hotel_id', hotelId);

      const url = `/api/v1/admin/reports/${reportType}.${format}?${params.toString()}`;

      // Trigger native download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportType}-${new Date().toISOString().slice(0,10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Report download failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: '700px' }}>
      <div className="card glass-card p-4">
        <h2 className="font-serif mb-3 text-center" style={{ color: 'var(--color-primary)' }}>System Report Generator</h2>
        <p className="text-muted text-center mb-4">Export analytics datasets for hotel performance, financial metrics, or user booking transactions in either CSV or PDF.</p>

        <form onSubmit={handleDownload}>
          <div className="mb-3">
            <label className="form-label" htmlFor="report-dataset">Select Dataset</label>
            <select
              className="form-select"
              id="report-dataset"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="bookings">Bookings Ledger (detailed listing)</option>
              <option value="payments">Payments Ledger (financial collections)</option>
              <option value="revenue">Revenue Summary (aggregated daily metrics)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="report-format">Export Format</label>
            <select
              className="form-select"
              id="report-format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="csv">CSV (Comma-Separated Values, Excel compatible)</option>
              <option value="pdf">PDF (Printable Document Format)</option>
            </select>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="report-start">Start Date (Optional)</label>
              <input
                type="date"
                className="form-control"
                id="report-start"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="report-end">End Date (Optional)</label>
              <input
                type="date"
                className="form-control"
                id="report-end"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="report-hotel">Filter by Hotel ID (Optional)</label>
            <input
              type="number"
              className="form-control"
              id="report-hotel"
              placeholder="e.g. 1"
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-accent w-100 py-3 rounded-pill"
            disabled={submitting}
            id="reports-download-btn"
          >
            {submitting ? (
              <span><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating Report...</span>
            ) : (
              <span><i className="bi bi-download me-2"></i>Generate & Download Report</span>
            )}
          </button>
        </form>
      </div>

      <div className="mt-4 card glass-card p-3 text-muted small">
        <h6 className="fw-bold mb-2"><i className="bi bi-info-circle me-2 text-primary"></i>Export System Notes:</h6>
        <ul className="mb-0 ps-3">
          <li>CSV files include UTF-8 BOM encoding so they open correctly in Microsoft Excel and support native language characters.</li>
          <li>Dates are inclusive for the filtered range and respect Sri Lankan timezone offsets.</li>
          <li>For security, formula injection characters are escaped to prevent spreadsheet execution exploits.</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminReports;
