import React, { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { PhotoProtocolPreset, PhotoSlotRecord } from './photoGridPresets';
import { exportProtocolGridAsPng } from './photoProtocolEngine';
import { showToast } from '../GlobalToast';

export interface PhotoCollageExportSheetProps {
	preset: PhotoProtocolPreset;
	slotsData: Record<string, PhotoSlotRecord>;
	clinicName: string;
	patientName: string;
	patientCardNumber: string;
	doctorName: string;
}

export const PhotoCollageExportSheet: React.FC<PhotoCollageExportSheetProps> = ({
	preset,
	slotsData,
	clinicName,
	patientName,
	patientCardNumber,
	doctorName,
}) => {
	const [isExportingPng, setIsExportingPng] = useState(false);

	const handleExportPng = async () => {
		if (isExportingPng) return;
		try {
			setIsExportingPng(true);
			await exportProtocolGridAsPng({
				clinicName,
				patientName,
				patientCardNumber,
				doctorName,
				presetTitle: preset.nameRu,
				slots: preset.slots.map((s) => {
					const img = slotsData[s.id]?.imageUrl;
					return {
						title: s.titleRu,
						label: s.shortLabelRu,
						...(img ? { imageUrl: img } : {}),
					};
				}),
			});
			showToast('Коллаж фотопротокола сохранён в PNG', 'success', 3000);
		} catch {
			showToast('Не удалось сформировать коллаж', 'error', 3000);
		} finally {
			setIsExportingPng(false);
		}
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
			{/* Action Toolbar */}
			<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }} className="no-print">
				<button
					type="button"
					className="photo-touch-btn primary"
					onClick={() => window.print()}
					data-testid="btn-print-protocol-pdf"
				>
					<Printer size={16} />
					Печать протокола (PDF)
				</button>
				<button
					type="button"
					className="photo-touch-btn"
					onClick={handleExportPng}
					aria-busy={isExportingPng}
					data-testid="btn-export-collage-png"
					style={{
						background: 'var(--surface, #f1f5f9)',
						border: '1px solid var(--line, #cbd5e1)',
						color: 'var(--ink, #0f172a)',
						fontWeight: 600,
						opacity: isExportingPng ? 0.7 : 1,
					}}
				>
					<Download size={16} />
					{isExportingPng ? 'Формирование PNG...' : 'Экспорт коллажа (PNG)'}
				</button>
			</div>

			{/* Presentation Sheet Container */}
			<div className="photo-collage-sheet">
				<div className="photo-collage-header">
					<div>
						<h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{clinicName}</h1>
						<div style={{ fontSize: '14px', color: 'var(--muted, #475569)', marginTop: '4px' }}>
							Клинический фотопротокол ортодонтического / эстетического лечения
						</div>
					</div>
					<div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--muted, #475569)' }}>
						<div><strong>Пациент:</strong> {patientName}</div>
						<div><strong>Карта:</strong> {patientCardNumber} • <strong>Дата:</strong> {new Date().toLocaleDateString('ru-RU')}</div>
						<div><strong>Лечащий врач:</strong> {doctorName}</div>
					</div>
				</div>

				{/* Collage Grid */}
				<div className="photo-collage-grid">
					{preset.slots.map(slotDef => {
						const rec = slotsData[slotDef.id] || { slotId: slotDef.id };
						return (
							<div key={slotDef.id} className="photo-collage-item">
								{rec.imageUrl ? (
									<img src={rec.imageUrl} alt={slotDef.titleRu} loading="lazy" decoding="async" className="photo-collage-thumb" />
								) : (
									<div className="photo-collage-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--muted, #94a3b8)' }}>
										Кадр отсутствует
									</div>
								)}
								<div className="photo-collage-label">{slotDef.shortLabelRu}</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
