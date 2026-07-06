import React, { useRef } from 'react';
import { generateClinicalPdf, PdfDocumentType } from '../../utils/pdf/unifiedPdfGenerator';

interface PdfExportWrapperProps {
  id: string;
  documentType: PdfDocumentType;
  title: string;
  patientName: string;
  clinicName?: string;
  children: React.ReactNode;
}

export function PdfExportWrapper({ 
  id, 
  documentType, 
  title, 
  patientName, 
  clinicName = "DENTE Premier Clinic",
  children 
}: PdfExportWrapperProps) {
  
  const handleExport = () => {
    generateClinicalPdf({
      elementId: id,
      documentType,
      filename: `${title.replace(/\s+/g, '_')}_${patientName.replace(/\s+/g, '_')}.pdf`,
      quality: 2
    });
  };

  return (
    <div className="pdf-export-container">
      <div className="mb-4 flex justify-end">
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
        >
          <span>Экспорт в PDF</span>
        </button>
      </div>

      {/* 
        This is the actual element that will be captured.
        In normal view it has a max-height and scrolls.
        During PDF generation, .pdf-rendering-active removes scrolling and expands to full height.
      */}
      <div 
        id={id} 
        className="pdf-document bg-white text-zinc-900 p-8 rounded-lg shadow-xl mx-auto overflow-hidden" 
        style={{ maxWidth: '210mm', minHeight: '297mm' }} // A4 dimensions approx
      >
        <div className="pdf-header flex justify-between items-end border-b-2 border-zinc-200 pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-800 tracking-tight">{clinicName}</h1>
            <p className="text-sm text-zinc-500 mt-1">Швейцарский стандарт качества | Лицензия ЛО-77-01-011</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-zinc-700">{title}</h2>
            <p className="text-sm text-zinc-600 mt-1">Пациент: <span className="font-medium">{patientName}</span></p>
            <p className="text-sm text-zinc-500">Дата: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>

        <div className="pdf-content">
          {children}
        </div>

        <div className="pdf-footer mt-16 pt-8 border-t border-zinc-200 flex justify-between text-sm text-zinc-600">
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-zinc-400 mb-2"></div>
            <span>Подпись Врача</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-zinc-400 mb-2"></div>
            <span>Подпись Пациента</span>
          </div>
        </div>
      </div>
    </div>
  );
}
