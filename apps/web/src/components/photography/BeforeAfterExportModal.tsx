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

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: 'rgba(15, 23, 42, 0.8)',
				backdropFilter: 'blur(6px)',
				zIndex: 50,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '20px',
			}}
			role="dialog"
			aria-modal="true"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				style={{
					background: 'var(--paper, #ffffff)',
					color: 'var(--ink, #0f172a)',
					borderRadius: '16px',
					border: '1px solid var(--line, #e2e8f0)',
					width: '100%',
					maxWidth: '560px',
					padding: '24px',
					display: 'flex',
					flexDirection: 'column',
					gap: '18px',
					boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
						<Download size={20} style={{ color: 'var(--brand-500, #2563eb)' }} />
						<h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
							Экспорт клинического коллажа
						</h3>
					</div>
					<button
						type="button"
						className="photo-touch-btn"
						onClick={onClose}
						aria-label="Закрыть окно экспорта (Esc)"
						style={{ minHeight: '36px', minWidth: '44px', padding: '4px 8px' }}
					>
						<X size={18} />
					</button>
				</div>

				<p style={{ fontSize: '13px', color: 'var(--muted, #64748b)', margin: 0 }}>
					Генерация презентационного листа с водяным знаком клиники, ФИО пациента ({patientName}), датой и сопоставлением оттенков VITA ({beforeShade} → {afterShade}).
				</p>

				{/* Format Selection */}
				<div>
					<label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
						Формат экспорта:
					</label>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						{[
							{ id: '16_9_hd', label: 'Презентация 16:9 Full HD (1920x1080) — Идеально для экрана и ТВ' },
							{ id: 'A4_landscape', label: 'Лист A4 Альбомный (297x210 мм, 300 DPI) — Для печати' },
							{ id: 'A4_portrait', label: 'Лист A4 Портретный (210x297 мм, 300 DPI) — Для истории болезни 043/у' },
						].map((fmt) => (
							<label
								key={fmt.id}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
									padding: '10px 14px',
									borderRadius: '8px',
									border: exportFormat === fmt.id ? '2px solid var(--brand-500, #2563eb)' : '1px solid var(--line, #cbd5e1)',
									background: exportFormat === fmt.id ? 'rgba(37, 99, 235, 0.06)' : 'var(--paper, #ffffff)',
									cursor: 'pointer',
									fontSize: '13px',
									fontWeight: 600,
									minHeight: '44px',
								}}
							>
								<input
									type="radio"
									name="exportFormat"
									value={fmt.id}
									checked={exportFormat === fmt.id}
									onChange={() => onExportFormatChange(fmt.id as CollageFormatType)}
								/>
								<span>{fmt.label}</span>
							</label>
						))}
					</div>
				</div>

				{/* Actions */}
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
					<button
						type="button"
						className="photo-touch-btn"
						onClick={onClose}
						style={{ minHeight: '44px', minWidth: '44px' }}
					>
						Отмена
					</button>

					<button
						type="button"
						className="photo-touch-btn"
						onClick={onExportPdf}
						style={{ minHeight: '44px', minWidth: '44px', padding: '8px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
						title="1-клик печать или экспорт листа сравнения в PDF"
					>
						<Printer size={16} />
						Печать в PDF
					</button>

					<button
						type="button"
						className="photo-touch-btn primary"
						onClick={onExportPng}
						style={{ minHeight: '44px', minWidth: '44px', padding: '8px 20px', fontWeight: 700 }}
					>
						<Download size={16} />
						{isExporting ? 'Экспорт...' : 'Скачать PNG'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default BeforeAfterExportModal;
