import React from 'react';
import { PdfExportWrapper } from './PdfExportWrapper';

interface SurgicalReportTemplateProps {
  patientName: string;
  implantSystem: string;
  sleeveDiameter: number;
  sleeveHeight: number;
  offset: number;
  aiSafetyStatus: 'safe' | 'warning' | 'danger';
}

export function SurgicalReportTemplate({ 
  patientName, 
  implantSystem, 
  sleeveDiameter, 
  sleeveHeight, 
  offset,
  aiSafetyStatus
}: SurgicalReportTemplateProps) {
  
  const statusColor = 
    aiSafetyStatus === 'safe' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 
    aiSafetyStatus === 'warning' ? 'text-amber-600 border-amber-200 bg-amber-50' : 
    'text-red-600 border-red-200 bg-red-50';

  const statusText = 
    aiSafetyStatus === 'safe' ? 'БЕЗОПАСНО: Коллизий не обнаружено' : 
    aiSafetyStatus === 'warning' ? 'ВНИМАНИЕ: Близость к нижнечелюстному нерву < 2мм' : 
    'ОПАСНОСТЬ: Пересечение с анатомическими структурами';

  return (
    <PdfExportWrapper 
      id="surgical-report-pdf"
      documentType="surgical_report"
      title="Хирургический Протокол (CBCT)"
      patientName={patientName}
    >
      <div className={`p-4 mb-6 border rounded-lg flex items-center gap-3 ${statusColor}`}>
        <div className="font-bold">ИИ-Вердикт Безопасности:</div>
        <div>{statusText}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-zinc-200 rounded p-2">
          <h4 className="text-sm font-semibold text-zinc-500 mb-2">Axial View</h4>
          <div className="w-full h-32 bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">Axial Render</div>
        </div>
        <div className="border border-zinc-200 rounded p-2">
          <h4 className="text-sm font-semibold text-zinc-500 mb-2">Sagittal View</h4>
          <div className="w-full h-32 bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">Sagittal Render</div>
        </div>
        <div className="border border-zinc-200 rounded p-2">
          <h4 className="text-sm font-semibold text-zinc-500 mb-2">Coronal View</h4>
          <div className="w-full h-32 bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">Coronal Render</div>
        </div>
        <div className="border border-zinc-200 rounded p-2">
          <h4 className="text-sm font-semibold text-zinc-500 mb-2">Cross-Section (Implant)</h4>
          <div className="w-full h-32 bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">Cross Render</div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-zinc-800 mb-4 border-b border-zinc-200 pb-2">График плотности костной ткани (HU)</h3>
        <div className="w-full h-40 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded flex items-center justify-center flex-col">
          <span className="text-zinc-400 font-medium">График HU профиля</span>
          <span className="text-xs text-zinc-500 mt-1">Классификация по Misch: D2 (850 - 1250 HU)</span>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-zinc-800 mb-4 border-b border-zinc-200 pb-2">Параметры хирургического шаблона</h3>
        <table className="w-full text-sm text-left border-collapse">
          <tbody>
            <tr className="border-b border-zinc-100">
              <td className="py-2 px-3 border border-zinc-200 font-medium bg-zinc-50 w-1/3">Система имплантатов</td>
              <td className="py-2 px-3 border border-zinc-200">{implantSystem}</td>
            </tr>
            <tr className="border-b border-zinc-100">
              <td className="py-2 px-3 border border-zinc-200 font-medium bg-zinc-50">Sleeve Diameter (Втулка)</td>
              <td className="py-2 px-3 border border-zinc-200">{sleeveDiameter} mm</td>
            </tr>
            <tr className="border-b border-zinc-100">
              <td className="py-2 px-3 border border-zinc-200 font-medium bg-zinc-50">Sleeve Height</td>
              <td className="py-2 px-3 border border-zinc-200">{sleeveHeight} mm</td>
            </tr>
            <tr className="border-b border-zinc-100">
              <td className="py-2 px-3 border border-zinc-200 font-medium bg-zinc-50">Drill Offset</td>
              <td className="py-2 px-3 border border-zinc-200">{offset} mm</td>
            </tr>
          </tbody>
        </table>
      </div>
    </PdfExportWrapper>
  );
}
