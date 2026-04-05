/**
 * Export data to CSV and trigger download
 * @param {Array<Object>} data - Array of objects
 * @param {string} filename - File name without extension
 * @param {Array<{key: string, label: string}>} columns - Column mapping
 */
export const exportToCSV = (data, filename, columns) => {
  if (!data?.length) return;
  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = c.key.split('.').reduce((o, k) => o?.[k], row);
      const str = val == null ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    })
  );
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * Export data to JSON and trigger download
 */
export const exportToJSON = (data, filename) => {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json');
};

/**
 * Print-friendly PDF generation via browser print
 * @param {string} title - Document title
 * @param {string} htmlContent - HTML string to print
 */
export const exportToPDF = (title, htmlContent) => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>${title}</title>
    <style>
      body { font-family: 'Inter', Arial, sans-serif; margin: 40px; color: #1e293b; }
      h1 { font-size: 18px; color: #0d9488; margin-bottom: 8px; }
      .meta { font-size: 11px; color: #94a3b8; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f1f5f9; color: #475569; text-align: left; padding: 8px 12px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
      td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) { background: #f8fafc; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
      .hipaa { margin-top: 32px; padding: 12px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; font-size: 10px; color: #0d9488; }
      @media print { body { margin: 20px; } }
    </style></head><body>
    <h1>${title}</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()} | HIPAA-Compliant Export</div>
    ${htmlContent}
    <div class="hipaa">This document contains Protected Health Information (PHI). Handle in accordance with HIPAA regulations. Do not distribute to unauthorized personnel.</div>
    </body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
};

/**
 * Generate HTML table from data for PDF export
 */
export const dataToHtmlTable = (data, columns) => {
  const ths = columns.map((c) => `<th>${c.label}</th>`).join('');
  const trs = data.map((row) => {
    const tds = columns.map((c) => {
      const val = c.key.split('.').reduce((o, k) => o?.[k], row);
      return `<td>${val ?? '—'}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
};

/** Internal helper to download a file */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
