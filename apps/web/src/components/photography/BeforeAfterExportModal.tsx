import React from 'react';
import { Download, Printer, X } from 'lucide-react';
import type { CollageFormatType } from './photoProtocolMath';

export interface BeforeAfterExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName: string;
	beforeShade: string;
	afterShade: string;
	exportFormat: CollageFormatType;
	onExportFormatChange: (format: CollageFormatType) => void;
	onExportPdf: () => void;
	onExportPng: () => void;
	isExporting: boolean;
}

export const BeforeAfterExportModal: React.FC<BeforeAfterExportModalProps> = ({
	isOpen,
	onClose,
	patientName,
	beforeShade,
	afterShade,
	exportFormat,
	onExportFormatChange,
	onExportPdf,
	onExportPng,
	isExporting,
}) => {
	if (!isOpen) return null;

	const formats: { id: CollageFormatType; label: string }[] = [
		{ id: '16_9_hd', label: 'Презентация 16:9 Full HD (1920x1080) — Для экрана' },
		{ id: 'A4_landscape', label: 'Лист A4 Альбомный (297x210 мм, 300 DPI) — Для печати' },
		{ id: 'A4_portrait', label: 'Лист A4 Портретный (210x297 мм) — Для карты 043/у' },
	];

	return (
		<div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div style={{ background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', borderRadius: '16px', border: '1px solid var(--line, #e2e8f0)', width: '100%', maxWidth: '540px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Download size={20} style={{ color: 'var(--brand-500, #2563eb)' }} />
						<h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Экспорт клинического коллажа</h3>
					</div>
					<button type="button" className="photo-touch-btn" onClick={onClose} aria-label="Закрыть" style={{ minHeight: '34px', minWidth: '44px', padding: '4px 8px' }}>
						<X size={16} />
					</button>
				</div>

				<p style={{ fontSize: '12px', color: 'var(--muted, #64748b)', margin: 0 }}>
					Коллаж для пациента ({patientName}) с водяным знаком и оттенками VITA ({beforeShade} → {afterShade}).
				</p>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					{formats.map((fmt) => (
						<label key={fmt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: exportFormat === fmt.id ? '2px solid var(--primary, #0d9488)' : '1px solid var(--line, #e2e8f0)', background: exportFormat === fmt.id ? 'rgba(13, 148, 136, 0.05)' : 'transparent', cursor: 'pointer', fontSize: '12px' }}>
							<input type="radio" name="exportFormat" checked={exportFormat === fmt.id} onChange={() => onExportFormatChange(fmt.id)} />
							<span>{fmt.label}</span>
						</label>
					))}
				</div>

				<div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--line, #e2e8f0)' }}>
					<button type="button" className="photo-touch-btn" onClick={onClose} style={{ minHeight: '38px', minWidth: '44px' }}>Отмена</button>
					<button type="button" className="photo-touch-btn" onClick={onExportPdf} style={{ minHeight: '38px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
						<Printer size={15} /> Печать PDF
					</button>
					<button type="button" className="photo-touch-btn primary" onClick={onExportPng} style={{ minHeight: '38px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
						<Download size={15} /> {isExporting ? 'Экспорт...' : 'Скачать PNG'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default BeforeAfterExportModal;
