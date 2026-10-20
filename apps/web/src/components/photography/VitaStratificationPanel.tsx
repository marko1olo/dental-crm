import React from 'react';
import { Layers } from 'lucide-react';
import { STUMP_NATURAL_DIE_SHADES, SHADE_SWATCH_MAP } from '../lab/labShadesData';
import type { VitaStratificationState } from './VitaShadeSelector';

export interface VitaStratificationPanelProps {
	strat: VitaStratificationState;
	onChange: (updates: Partial<VitaStratificationState>) => void;
}

export const VitaStratificationPanel: React.FC<VitaStratificationPanelProps> = ({ strat, onChange }) => {
	const zones: { key: keyof VitaStratificationState; label: string; desc: string }[] = [
		{ key: 'cervical', label: 'Пришеечная зона', desc: 'Теплый, опаковый' },
		{ key: 'body', label: 'Тело зуба', desc: 'Основной оттенок дентина' },
		{ key: 'incisal', label: 'Режущий край', desc: 'Прозрачный, светлый' },
	];

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'var(--surface, #f8fafc)', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)' }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
				<Layers size={14} style={{ color: 'var(--primary, #0d9488)' }} /> 3-Зонная стратификация коронки (ЗТЛ):
			</div>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
				{zones.map((z) => (
					<div key={z.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
						<span style={{ fontSize: '11px', fontWeight: 700 }}>{z.label}:</span>
						<span style={{ fontSize: '10px', color: 'var(--muted, #64748b)' }}>{z.desc}</span>
						<input
							type="text"
							value={strat[z.key] || ''}
							onChange={(e) => onChange({ [z.key]: e.target.value.toUpperCase() })}
							style={{ minHeight: '32px', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--line, #cbd5e1)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '12px', fontWeight: 700 }}
						/>
					</div>
				))}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
					<span style={{ fontSize: '11px', fontWeight: 700 }}>Цвет культи (ND):</span>
					<span style={{ fontSize: '10px', color: 'var(--muted, #64748b)' }}>Культевая шкала</span>
					<select
						value={strat.stump || ''}
						onChange={(e) => onChange({ stump: e.target.value })}
						style={{ minHeight: '32px', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--line, #cbd5e1)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '12px', fontWeight: 700 }}
					>
						<option value="">Не выбрано</option>
						{STUMP_NATURAL_DIE_SHADES.map((nd) => (
							<option key={nd.id} value={nd.id}>{nd.name}</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};

export default VitaStratificationPanel;
