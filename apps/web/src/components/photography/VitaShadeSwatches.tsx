import React, { useMemo } from 'react';
import { VitaShade, normalizeVitaShadeCode } from './vitaShadesCatalog';

export interface VitaShadeSwatchesProps {
	shades: VitaShade[];
	selectedCode: string;
	onSelect: (code: string) => void;
	searchQuery: string;
}

export const VitaShadeSwatches: React.FC<VitaShadeSwatchesProps> = ({ shades, selectedCode, onSelect, searchQuery }) => {
	const filtered = useMemo(() => {
		if (!searchQuery.trim()) return shades;
		const normQ = normalizeVitaShadeCode(searchQuery).toLowerCase();
		return shades.filter((s) => s.code.toLowerCase().includes(normQ) || s.nameRu.toLowerCase().includes(normQ));
	}, [shades, searchQuery]);

	return (
		<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: '4px', maxHeight: '160px', overflowY: 'auto', padding: '2px' }}>
			{filtered.map((s) => {
				const isSel = s.code.toUpperCase() === selectedCode.toUpperCase();
				return (
					<button
						key={s.code}
						type="button"
						className="photo-touch-btn"
						onClick={() => onSelect(s.code)}
						style={{
							minHeight: '44px',
							minWidth: '44px',
							padding: '4px 2px',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							background: isSel ? 'var(--primary, #0d9488)' : 'var(--paper-soft, #f8fafc)',
							color: isSel ? '#fff' : 'var(--ink, #0f172a)',
							border: isSel ? '2px solid var(--primary-strong, #0f766e)' : '1px solid var(--line, #e2e8f0)',
							borderRadius: '6px',
						}}
						title={`${s.code} (${s.nameRu})`}
					>
						<span style={{ width: '18px', height: '10px', borderRadius: '2px', background: `rgb(${s.rgb.r},${s.rgb.g},${s.rgb.b})`, border: '1px solid rgba(0,0,0,0.15)', marginBottom: '2px' }} />
						<span style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1 }}>{s.code}</span>
					</button>
				);
			})}
		</div>
	);
};

export default VitaShadeSwatches;
