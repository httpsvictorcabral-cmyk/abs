import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(data: any[], filename: string, sheetName = 'Dados') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    const csv = '\n';
    downloadBlob(csv, `${filename}.csv`, 'text/csv');
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    ),
  ];
  downloadBlob(csvRows.join('\n'), `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToPDF(
  title: string,
  data: any[],
  filename: string,
  columns?: { header: string; dataKey: string }[]
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 27);

  const cols = columns || (data.length > 0
    ? Object.keys(data[0]).map(k => ({ header: k, dataKey: k }))
    : []);

  const rows = data.map(row => {
    const obj: Record<string, any> = {};
    for (const col of cols) {
      obj[col.dataKey] = row[col.dataKey] ?? '';
    }
    return obj;
  });

  autoTable(doc, {
    head: [cols.map(c => c.header)],
    body: rows.map(r => cols.map(c => r[c.dataKey])),
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
