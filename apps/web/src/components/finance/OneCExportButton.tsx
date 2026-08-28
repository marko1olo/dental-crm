import React, { useState } from 'react';
import { FileCode2, Download, Check, AlertCircle } from 'lucide-react';
import {
  generateOneCEnterpriseXml,
  type OneCDocumentType,
  type OneCExportParams,
} from '@dental/shared';
import { showToast } from '../GlobalToast';
import { Billing1CExportModal } from './Billing1CExportModal';

export interface OneCExportItem {
  id?: string | undefined;
  code804n?: string | undefined;
  name: string;
  toothNumber?: number | undefined;
  quantity?: number | undefined;
  priceRub: number;
  discountRub?: number | undefined;
}

export interface OneCExportButtonProps {
  actNumber: string;
  documentDate?: string | undefined;
  docType?: OneCDocumentType | undefined;
  patientName?: string | undefined;
  patientId?: string | undefined;
  patientPhone?: string | undefined;
  patientAddress?: string | undefined;
  doctorName?: string | undefined;
  clinicName?: string | undefined;
  clinicInn?: string | undefined;
  clinicKpp?: string | undefined;
  items: readonly OneCExportItem[];
  totalRub: number;
  contractNumber?: string | undefined;
  contractDate?: string | undefined;
  className?: string | undefined;
  label?: string | undefined;
  variant?: 'primary' | 'secondary' | 'outline' | 'compact' | undefined;
}

function triggerXmlDownload(xmlContent: string, filename: string) {
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const OneCExportButton: React.FC<OneCExportButtonProps> = ({
  actNumber,
  documentDate,
  docType = 'act',
  patientName = 'Пациент',
  patientId = 'pat-1',
  patientPhone = '',
  patientAddress = '',
  doctorName = 'Врач стоматолог',
  clinicName = 'ООО «ДЕНТЕ СТОМАТОЛОГИЯ»',
  clinicInn = '7701234567',
  clinicKpp = '770101001',
  items,
  totalRub,
  contractNumber = 'Д-2026/01',
  contractDate,
  className = '',
  label = '📄 Экспорт в 1С (XML)',
  variant = 'secondary',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setIsModalOpen(true);
      return;
    }
    if (items.length === 0) {
      showToast('Нет позиций для выгрузки в 1С', 'warning');
      return;
    }

    setIsExporting(true);
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const effectiveDate = documentDate || todayIso;
      const exportId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`;

      const exportParams: OneCExportParams = {
        exportId,
        generatedAt: new Date().toISOString(),
        clinic: {
          id: 'clinic-dente',
          name: clinicName,
          fullName: clinicName,
          inn: clinicInn,
          kpp: clinicKpp,
          isLegalEntity: true,
          phone: '+7 (495) 123-45-67',
          address: 'г. Москва, ул. Стоматологическая, д. 10',
        },
        documents: [
          {
            id: `doc-${actNumber}`,
            number: actNumber,
            documentDate: effectiveDate,
            documentTime: '12:00:00',
            docType,
            operationName: docType === 'act' ? 'Реализация медицинских услуг' : 'Заказ покупателя',
            patient: {
              id: patientId,
              name: patientName,
              fullName: patientName,
              phone: patientPhone || null,
              address: patientAddress || null,
              isLegalEntity: false,
            },
            items: items.map((it, idx) => {
              const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
              const unitPriceKop = Math.round(it.priceRub * 100);
              const discKop = Math.round((it.discountRub || 0) * 100);
              const totalKop = Math.max(0, unitPriceKop * qty - discKop);
              return {
                id: it.id || `item-${idx + 1}`,
                code804n: it.code804n || null,
                name: it.name,
                toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
                quantity: qty,
                priceKopecks: unitPriceKop,
                discountPercent: it.discountRub ? Math.round((it.discountRub / (it.priceRub * qty)) * 100) : 0,
                totalKopecks: totalKop,
                vatRate: 'Без НДС',
                vatAmountKopecks: 0,
              };
            }),
            totalKopecks: Math.round(totalRub * 100),
            contractNumber: contractNumber || null,
            contractDate: contractDate || null,
            attendingDoctorName: doctorName,
            comment: `Выгрузка из CRM DENTE: ${actNumber}`,
          },
        ],
      };

      const xml = generateOneCEnterpriseXml(exportParams);
      const filename = `1C_Export_${actNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${effectiveDate}.xml`;
      triggerXmlDownload(xml, filename);

      setIsExported(true);
      showToast(`Файл выгрузки 1С:Предприятие (${filename}) успешно сформирован и скачан!`, 'success', 5000);
      setTimeout(() => setIsExported(false), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showToast(`Ошибка формирования XML для 1С: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const variantStyles = {
    primary: 'bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] hover:opacity-90 shadow-xs font-semibold',
    secondary: 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/50 font-semibold',
    outline: 'border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]',
    compact: 'p-1.5 text-xs rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        title="Сформировать и скачать официальный файл выгрузки в 1С:Бухгалтерия 8.3 / УТ (CommerceML 2.09) (Shift+Click: расширенная студия 1С)"
        data-testid="1c-export-xml-button"
        className={`h-9 px-3.5 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 select-none whitespace-nowrap ${variantStyles[variant]} ${className}`.trim()}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
      >
        {isExported ? (
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <FileCode2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span className="whitespace-nowrap">{isExported ? '1C XML Скачан' : label}</span>
      </button>

      {isModalOpen && (
        <Billing1CExportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          actNumber={actNumber}
          contractNumber={contractNumber}
          contractDate={contractDate}
          doctorName={doctorName}
          patientName={patientName}
          patientId={patientId}
          patientPhone={patientPhone}
          patientAddress={patientAddress}
          clinicName={clinicName}
          clinicInn={clinicInn}
          clinicKpp={clinicKpp}
          items={items}
          totalRub={totalRub}
        />
      )}
    </>
  );
};
