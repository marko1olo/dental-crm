import React from 'react';
import { Printer } from 'lucide-react';
import { PhotoProtocolPreset, PhotoSlotRecord } from './photoGridPresets';

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
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
			{/* Action Toolbar */}
			<div style={{ display: 'flex', gap: '12px' }} className="no-print">
				<button
					className="photo-touch-btn primary"
					onClick={() => window.print()}
				>
					<Printer size={16} />
					Печать протокола (PDF)
				</button>
			</div>

			{/* Presentation Sheet Container */}
			<div className="photo-collage-sheet">
				<div className="photo-collage-header">
					<div>
						<h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{clinicName}</h1>
						<div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>
							Клинический фотопротокол ортодонтического / эстетического лечения
						</div>
					</div>
					<div style={{ textAlign: 'right', fontSize: '12px', color: '#475569' }}>
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
									<img src={rec.imageUrl} alt={slotDef.titleRu} className="photo-collage-thumb" />
								) : (
									<div className="photo-collage-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8' }}>
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
