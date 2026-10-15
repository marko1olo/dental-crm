import React, { useState, useMemo } from 'react';
import { ArrowRight, Send } from 'lucide-react';
import {
	VitaSystemType,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	calculateShadeDelta,
	getVitaShadeByCode,
} from './vitaShadesCatalog';
import { getStratificationPreset } from '../lab/labShadesData';
import { VitaStratificationPanel } from './VitaStratificationPanel';
import { VitaShadeSwatches } from './VitaShadeSwatches';
import { showToast } from '../GlobalToast';

export interface VitaStratificationState {
	cervical: string;
	body: string;
	incisal: string;
	stump?: string;
}

export interface VitaShadeSelectorProps {
	beforeShadeCode?: string;
	afterShadeCode?: string;
	onBeforeShadeChange: (code: string) => void;
	onAfterShadeChange: (code: string) => void;
	compact?: boolean;
	beforeStratification?: VitaStratificationState;
	afterStratification?: VitaStratificationState;
	onBeforeStratificationChange?: (strat: VitaStratificationState) => void;
	onAfterStratificationChange?: (strat: VitaStratificationState) => void;
}

export const VitaShadeSelector: React.FC<VitaShadeSelectorProps> = ({
	beforeShadeCode = 'A3',
	afterShadeCode = 'A1',
	onBeforeShadeChange,
	onAfterShadeChange,
	compact = false,
	beforeStratification,
	afterStratification,
	onBeforeStratificationChange,
	onAfterStratificationChange,
}) => {
	const [activeSystem, setActiveSystem] = useState<VitaSystemType>('classical');
	const [activeTarget, setActiveTarget] = useState<'before' | 'after'>('after');
	const [searchQuery, setSearchQuery] = useState('');
	const [showStrat, setShowStrat] = useState(false);

	const [localBeforeStrat, setLocalBeforeStrat] = useState<VitaStratificationState>(() => beforeStratification || { ...getStratificationPreset(beforeShadeCode, 'natural'), stump: '' });
	const [localAfterStrat, setLocalAfterStrat] = useState<VitaStratificationState>(() => afterStratification || { ...getStratificationPreset(afterShadeCode, 'natural'), stump: '' });

	const currentBefore = useMemo(() => getVitaShadeByCode(beforeShadeCode) || VITA_CLASSICAL_SHADES[8]!, [beforeShadeCode]);
	const currentAfter = useMemo(() => getVitaShadeByCode(afterShadeCode) || VITA_CLASSICAL_SHADES[5]!, [afterShadeCode]);
	const delta = useMemo(() => calculateShadeDelta(currentBefore, currentAfter), [currentBefore, currentAfter]);

	const shades = activeSystem === 'classical' ? VITA_CLASSICAL_SHADES : VITA_3D_MASTER_SHADES;
	const selectedCode = activeTarget === 'before' ? beforeShadeCode : afterShadeCode;
	const activeStrat = activeTarget === 'before' ? (beforeStratification || localBeforeStrat) : (afterStratification || localAfterStrat);

	const updateStrat = (updates: Partial<VitaStratificationState>) => {
		if (activeTarget === 'before') {
			const next = { ...(beforeStratification || localBeforeStrat), ...updates };
			setLocalBeforeStrat(next);
			onBeforeStratificationChange?.(next);
		} else {
			const next = { ...(afterStratification || localAfterStrat), ...updates };
			setLocalAfterStrat(next);
			onAfterStratificationChange?.(next);
		}
	};

	const handleTransferToLab = () => {
		const payload = { beforeShade: beforeShadeCode, afterShade: afterShadeCode, stratification: activeStrat, date: new Date().toISOString() };
		localStorage.setItem('dente_active_lab_shade_preset', JSON.stringify(payload));
		window.dispatchEvent(new CustomEvent('dente-apply-lab-shade', { detail: payload }));
		showToast(`Оттенок VITA ${afterShadeCode} передан в заказ ЗТЛ`, 'success', 3000);
	};

	return (
		<div className="vita-shade-selector-root" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
					<button type="button" className={`photo-touch-btn ${activeTarget === 'before' ? 'primary' : ''}`} onClick={() => setActiveTarget('before')} style={{ minHeight: '34px', minWidth: '44px', fontSize: '12px' }}>До: {beforeShadeCode}</button>
					<ArrowRight size={14} />
					<button type="button" className={`photo-touch-btn ${activeTarget === 'after' ? 'primary' : ''}`} onClick={() => setActiveTarget('after')} style={{ minHeight: '34px', minWidth: '44px', fontSize: '12px' }}>После: {afterShadeCode}</button>
					<span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface, #f1f5f9)', fontWeight: 700 }}>ΔE: {delta.deltaE00.toFixed(1)}</span>
				</div>
				<div style={{ display: 'flex', gap: '4px' }}>
					<button type="button" className={`photo-touch-btn ${activeSystem === 'classical' ? 'primary' : ''}`} onClick={() => setActiveSystem('classical')} style={{ minHeight: '34px', minWidth: '44px', fontSize: '12px' }}>Classical</button>
					<button type="button" className={`photo-touch-btn ${activeSystem === '3d_master' ? 'primary' : ''}`} onClick={() => setActiveSystem('3d_master')} style={{ minHeight: '34px', minWidth: '44px', fontSize: '12px' }}>3D-Master</button>
					<button type="button" className="photo-touch-btn" data-testid="btn-transfer-vita-to-lab" onClick={handleTransferToLab} style={{ minHeight: '34px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}><Send size={13} /> В ЗТЛ</button>
				</div>
			</div>

			<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
				<input type="text" placeholder="Поиск оттенка (A2, 2M2, BL2)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, minHeight: '34px', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--line, #cbd5e1)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)', fontSize: '12px' }} />
				<button type="button" className={`photo-touch-btn ${showStrat ? 'primary' : ''}`} onClick={() => setShowStrat(!showStrat)} style={{ minHeight: '34px', minWidth: '44px', fontSize: '12px' }}>Стратификация</button>
			</div>

			{showStrat && <VitaStratificationPanel strat={activeStrat} onChange={updateStrat} />}

			<VitaShadeSwatches shades={shades} selectedCode={selectedCode} onSelect={(c) => (activeTarget === 'before' ? onBeforeShadeChange(c) : onAfterShadeChange(c))} searchQuery={searchQuery} />
		</div>
	);
};

export default VitaShadeSelector;
