import React from 'react';

interface PdfExportWrapperProps {
  id: string;
  documentType: string;
  title: string;
  patientName: string;
  clinicName?: string;
  children: React.ReactNode;
}

export function PdfExportWrapper({ 
  id, 
  title, 
  patientName, 
  clinicName = "DENTE Premier Clinic",
  children 
}: PdfExportWrapperProps) {
  
  const handleExport = () => {
    console.log("PDF Export not implemented in this build");
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
      <div 
        id={id} 
        className="pdf-document bg-white text-zinc-900 p-8 rounded-lg shadow-xl mx-auto overflow-hidden" 
        style={{ maxWidth: '210mm', minHeight: '297mm' }}
      >
        <div className="pdf-header flex justify-between items-end border-b-2 border-zinc-200 pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-800 tracking-tight">{clinicName}</h1>
            <p className="text-sm text-zinc-500 mt-1">Швейцарский стандарт качества</p>
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
      </div>
    </div>
  );
}
