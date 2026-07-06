import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function generateClinicalReportPdf({
  patientInfo,
  implants,
  containerElement
}: {
  patientInfo: {
    fullName: string;
    studyId: string;
    date: string;
  };
  implants: any[];
  containerElement: HTMLElement | null;
}) {
  if (!containerElement) return;

  // Render the current view to a canvas
  const canvas = await html2canvas(containerElement, {
    useCORS: true,
    scale: 2, // High resolution
    logging: false,
    backgroundColor: '#000000',
  });

  const imgData = canvas.toDataURL('image/png');

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4' // 297 x 210 mm
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Draw Header
  pdf.setFillColor(20, 20, 20);
  pdf.rect(0, 0, pageWidth, 25, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text('DENTE CBCT CLINICAL REPORT', 10, 15);

  pdf.setFontSize(10);
  pdf.text(`Patient: ${patientInfo.fullName}`, pageWidth - 100, 10);
  pdf.text(`Study ID: ${patientInfo.studyId}`, pageWidth - 100, 16);
  pdf.text(`Date: ${patientInfo.date}`, pageWidth - 100, 22);

  // Add the screenshot image
  // Leave 30mm for header, 10mm for margins
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  const finalImgHeight = Math.min(imgHeight, pageHeight - 60);
  const finalImgWidth = (canvas.width * finalImgHeight) / canvas.height;
  
  const xOffset = (pageWidth - finalImgWidth) / 2;
  
  pdf.addImage(imgData, 'PNG', xOffset, 30, finalImgWidth, finalImgHeight);

  // Add Implants Information footer
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  let yCursor = 30 + finalImgHeight + 10;
  
  pdf.text('Planned Implants:', 10, yCursor);
  yCursor += 6;
  
  pdf.setFontSize(9);
  if (implants.length === 0) {
    pdf.text('No implants placed.', 10, yCursor);
  } else {
    implants.forEach((imp, i) => {
      pdf.text(
        `${i + 1}. Brand: ${imp.brand} | Size: ${imp.diameter} x ${imp.length}mm | HU Score: ${imp.densityScore || 'N/A'} (Zone: ${imp.densityZone || 'N/A'})`,
        10, 
        yCursor
      );
      yCursor += 5;
    });
  }

  // Safety Status
  pdf.setTextColor(200, 0, 0);
  const hasCollision = implants.some(i => i.collisionWarning);
  if (hasCollision) {
    pdf.text('WARNING: Critical proximity to nerve canal detected in planning!', 10, yCursor + 5);
  } else {
    pdf.setTextColor(0, 150, 0);
    pdf.text('Safety Status: Clear (No immediate nerve collisions detected)', 10, yCursor + 5);
  }

  // Download
  pdf.save(`CBCT_Report_${patientInfo.fullName.replace(/\s+/g, '_')}.pdf`);
}
