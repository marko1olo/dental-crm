import React from 'react';
import { CheckCircle, X, Grid, FileText, MoveHorizontal, ExternalLink } from 'lucide-react';
import { CheekRetractor } from '../icons/DentalIcons';
import { openPatientPresentationWindow } from './presentationSyncProtocol';
import type { PhotoSlotRecord } from './photoGridPresets';

export interface ClinicalPhotoProtocolHeaderProps {
	readonly patientName: string;
	readonly patientCardNumber: string;
	readonly doctorName: string;
	readonly clinicName: string;
	readonly activeViewMode: 'grid' | 'comparison' | 'export';
	readonly setActiveViewMode: (mode: 'grid' | 'comparison' | 'export') => void;
	readonly slotsData: Record<string, PhotoSlotRecord>;
	readonly activePresetId: string;
	readonly onSaveProtocol: (slots: Record<string, PhotoSlotRecord>, presetId: string) => void;
	readonly onClose: () => void;
}

export const ClinicalPhotoProtocolHeader: React.FC<ClinicalPhotoProtocolHeaderProps> = ({
	patientName,
	patientCardNumber,
	doctorName,
	clinicName,
	activeViewMode,
	setActiveViewMode,
	slotsData,
	activePresetId,
	onSaveProtocol,
	onClose,
}) => {
	return (
		<div className="photo-protocol-header">
			<div className="photo-protocol-title-group">
				<div className="photo-protocol-badge-icon"><CheekRetractor size={22} /></div>
				<div>
					<h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Клинический фотопротокол</h2>
					<div style={{ fontSize: '13px', color: 'var(--muted, #64748b)' }}>
						Пациент: <strong>{patientName}</strong> ({patientCardNumber}) • Врач: {doctorName}
					</div>
				</div>
			</div>
			<div className="photo-protocol-tabs">
				<button type="button" className={`photo-protocol-tab-btn ${activeViewMode === 'grid' ? 'active' : ''}`} onClick={() => setActiveViewMode('grid')}><Grid size={16} /> Сетка</button>
				<button type="button" className={`photo-protocol-tab-btn ${activeViewMode === 'comparison' ? 'active' : ''}`} onClick={() => setActiveViewMode('comparison')}><MoveHorizontal size={16} /> Сравнение</button>
				<button type="button" className={`photo-protocol-tab-btn ${activeViewMode === 'export' ? 'active' : ''}`} onClick={() => setActiveViewMode('export')}><FileText size={16} /> В ЗТЛ</button>
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				<button type="button" className="photo-touch-btn" data-testid="btn-patient-presentation-popout" onClick={() => openPatientPresentationWindow({ clinicName, patientName, mode: 'split' })} title="Экран пациента"><ExternalLink size={16} /> Экран</button>
				<button type="button" className="photo-touch-btn primary" onClick={() => onSaveProtocol(slotsData, activePresetId)} data-testid="btn-save-photo-protocol"><CheckCircle size={16} /> Сохранить</button>
				<button type="button" className="photo-touch-btn" onClick={onClose} title="Закрыть"><X size={18} /></button>
			</div>
		</div>
	);
};
