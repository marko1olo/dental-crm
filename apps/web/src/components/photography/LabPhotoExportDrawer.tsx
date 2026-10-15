import React, { useState } from 'react';
import { Download, Printer, Send } from 'lucide-react';
import { PhotoProtocolPreset, PhotoSlotRecord } from './photoGridPresets';
import { showToast } from '../GlobalToast';
import { exportCollageAsPng, exportCollageAsPdf } from './photoProtocolEngine';

export interface LabPhotoExportDrawerProps {
	preset: PhotoProtocolPreset;
	slotsData: Record<string, PhotoSlotRecord>;
	clinicName?: string;
	patientName?: string;
	patientCardNumber?: string;
	doctorName?: string;
	onClose?: () => void;
}

export const LabPhotoExportDrawer: React.FC<LabPhotoExportDrawerProps> = ({
	preset,
	slotsData,
	clinicName = 'DENTE CLINIC',
	patientName = '',
	patientCardNumber = 'К-8492',
	doctorName = 'Д-р Смирнова Е. В.',
}) => {
	const [selectedShade, setSelectedShade] = useState('A2');
	const [labComment, setLabComment] = useState('Фронтальная реставрация. Воспроизвести микрорельеф и прозрачный режущий край.');
	const quickShades = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2', 'BL1', 'BL2'];

	const handleTransferToLab = () => {
		const payload = { shade: selectedShade, comment: labComment, date: new Date().toISOString() };
		localStorage.setItem('dente_active_lab_shade_preset', JSON.stringify(payload));
		window.dispatchEvent(new CustomEvent('dente-apply-lab-shade', { detail: payload }));
		showToast(`Оттенок VITA ${selectedShade} передан в заказ-наряд ЗТЛ`, 'success', 3000);
	};

	const handleExportPng = async () => {
		try {
			await exportCollageAsPng(preset, slotsData, clinicName, patientName, patientCardNumber, doctorName, '16_9_hd');
			showToast('Коллаж успешно сохранен в PNG', 'success');
		} catch {
			showToast('Ошибка экспорта коллажа', 'error');
		}
	};

	return (
		<div className="lab-export-drawer" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '960px', margin: '0 auto' }}>
			<div style={{ background: 'var(--surface, #f8fafc)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '12px' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
					<span style={{ fontSize: '13px', fontWeight: 700 }}>Цвет зубов по шкале VITA для лаборатории:</span>
					<span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary, #0d9488)' }}>Выбран: VITA {selectedShade}</span>
				</div>
				<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
					{quickShades.map((sh) => (
						<button key={sh} type="button" className={`photo-touch-btn ${selectedShade === sh ? 'primary' : ''}`} onClick={() => setSelectedShade(sh)} style={{ minHeight: '36px', minWidth: '44px', fontSize: '12px', fontWeight: 700 }}>{sh}</button>
					))}
				</div>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
				<label style={{ fontSize: '12px', fontWeight: 700 }}>Техническое задание и комментарий технику (ЗТЛ):</label>
				<textarea rows={2} value={labComment} onChange={(e) => setLabComment(e.target.value)} placeholder="Укажите особенности прозрачности, мамелонов, анатомии..." style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '12px' }} />
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
				{preset.slots.map((slot) => {
					const rec = slotsData[slot.id];
					return (
						<div key={slot.id} style={{ border: '1px solid var(--line, #e2e8f0)', borderRadius: '6px', overflow: 'hidden', background: 'var(--paper, #fff)' }}>
							<div style={{ height: '70px', background: 'var(--surface, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								{rec?.imageUrl ? <img src={rec.imageUrl} alt={slot.shortLabelRu} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', color: '#94a3b8' }}>Нет фото</span>}
							</div>
							<div style={{ padding: '3px', fontSize: '10px', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slot.shortLabelRu}</div>
						</div>
					);
				})}
			</div>

			<div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--line, #e2e8f0)' }}>
				<button type="button" className="photo-touch-btn" data-testid="btn-transfer-vita-to-lab" onClick={handleTransferToLab} style={{ minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
					<Send size={15} /> Передать в заказ ЗТЛ
				</button>
				<button type="button" className="photo-touch-btn" data-testid="btn-export-lab-png" onClick={handleExportPng} style={{ minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
					<Download size={15} /> Экспорт PNG
				</button>
				<button type="button" className="photo-touch-btn primary" data-testid="btn-export-lab-pdf" onClick={() => exportCollageAsPdf(preset, slotsData, clinicName, patientName, patientCardNumber, doctorName, 'A4_landscape')} style={{ minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
					<Printer size={15} /> Печать PDF
				</button>
			</div>
		</div>
	);
};

export default LabPhotoExportDrawer;
