import React, { useState, useMemo } from 'react';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import {
	VitaSystemType,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	calculateShadeDelta,
	getVitaShadeByCode,
	ShadeDeltaResult,
} from './vitaShadesCatalog';

export interface VitaShadeSelectorProps {
	beforeShadeCode?: string;
	afterShadeCode?: string;
	onBeforeShadeChange: (code: string) => void;
	onAfterShadeChange: (code: string) => void;
	compact?: boolean;
}

export const VitaShadeSelector: React.FC<VitaShadeSelectorProps> = ({
	beforeShadeCode = 'A3',
	afterShadeCode = 'A1',
	onBeforeShadeChange,
	onAfterShadeChange,
	compact = false,
}) => {
	const [activeSystem, setActiveSystem] = useState<VitaSystemType>('classical');
	const [activePickerTarget, setActivePickerTarget] = useState<'before' | 'after'>('after');
	const [searchQuery, setSearchQuery] = useState('');

	const currentBeforeShade = useMemo(() => {
		return getVitaShadeByCode(beforeShadeCode) || VITA_CLASSICAL_SHADES[8]!;
	}, [beforeShadeCode]);

	const currentAfterShade = useMemo(() => {
		return getVitaShadeByCode(afterShadeCode) || VITA_CLASSICAL_SHADES[5]!;
	}, [afterShadeCode]);

	const deltaResult: ShadeDeltaResult = useMemo(() => {
		return calculateShadeDelta(currentBeforeShade, currentAfterShade);
	}, [currentBeforeShade, currentAfterShade]);

	const shadesList = useMemo(() => {
		const list = activeSystem === 'classical' ? VITA_CLASSICAL_SHADES : VITA_3D_MASTER_SHADES;
		if (!searchQuery.trim()) return list;
		const q = searchQuery.trim().toLowerCase();
		return list.filter(s => s.code.toLowerCase().includes(q) || s.nameRu.toLowerCase().includes(q));
	}, [activeSystem, searchQuery]);

	const handleSelectShade = (code: string) => {
		if (activePickerTarget === 'before') {
			onBeforeShadeChange(code);
		} else {
			onAfterShadeChange(code);
		}
	};

	return (
		<div className="vita-shade-selector-container" style={{
			background: 'var(--paper, #ffffff)',
			border: '1px solid var(--line, #e2e8f0)',
			borderRadius: '12px',
			padding: compact ? '12px' : '16px',
			display: 'flex',
			flexDirection: 'column',
			gap: '14px',
			width: '100%',
		}}>
			{/* Header & Comparative Summary */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				flexWrap: 'wrap',
				gap: '12px',
			}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<Sparkles size={18} style={{ color: 'var(--brand-500, #2563eb)' }} />
					<span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink, #0f172a)' }}>
						Определение цвета по шкале VITA (Колориметрия)
					</span>
				</div>

				{/* System Switcher */}
				<div style={{ display: 'flex', gap: '4px', background: 'var(--surface, #f1f5f9)', padding: '3px', borderRadius: '8px' }}>
					<button
						type="button"
						className={`photo-touch-btn ${activeSystem === 'classical' ? 'primary' : ''}`}
						onClick={() => setActiveSystem('classical')}
						style={{ minHeight: '34px', minWidth: '44px', padding: '4px 10px', fontSize: '12px' }}
					>
						VITA Classical (A1-D4, BL1-4)
					</button>
					<button
						type="button"
						className={`photo-touch-btn ${activeSystem === '3d_master' ? 'primary' : ''}`}
						onClick={() => setActiveSystem('3d_master')}
						style={{ minHeight: '34px', minWidth: '44px', padding: '4px 10px', fontSize: '12px' }}
					>
						VITA 3D-Master (1M1-5M3)
					</button>
				</div>
			</div>

			{/* Delta Metrics & Comparison Card */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'auto 1fr auto',
				alignItems: 'center',
				gap: '12px',
				background: 'var(--surface, #f8fafc)',
				border: '1px solid var(--line, #e2e8f0)',
				borderRadius: '10px',
				padding: '10px 14px',
			}}>
				{/* Before Shade Card */}
				<button
					type="button"
					onClick={() => setActivePickerTarget('before')}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						background: activePickerTarget === 'before' ? 'var(--paper-strong, #ffffff)' : 'transparent',
						border: `2px solid ${activePickerTarget === 'before' ? 'var(--brand-500, #2563eb)' : 'transparent'}`,
						borderRadius: '8px',
						padding: '6px 10px',
						cursor: 'pointer',
						textAlign: 'left',
						minHeight: '44px',
					}}
				>
					<div
						style={{
							width: '32px',
							height: '32px',
							borderRadius: '6px',
							backgroundColor: `rgb(${currentBeforeShade.rgb.r}, ${currentBeforeShade.rgb.g}, ${currentBeforeShade.rgb.b})`,
							boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
							flexShrink: 0,
						}}
					/>
					<div>
						<div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)' }}>ДО:</div>
						<div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink, #0f172a)' }}>
							{currentBeforeShade.code}
						</div>
					</div>
				</button>

				{/* Delta Arrow & Metrics */}
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<ArrowRight size={16} style={{ color: 'var(--muted, #64748b)' }} />
						<span style={{
							fontSize: '12px',
							fontWeight: 700,
							padding: '2px 8px',
							borderRadius: '12px',
							background: deltaResult.isLighter ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
							color: deltaResult.isLighter ? '#15803d' : '#b91c1c',
						}}>
							{deltaResult.deltaL >= 0 ? `+${deltaResult.deltaL}` : deltaResult.deltaL} ΔL*
						</span>
						<span style={{
							fontSize: '12px',
							fontWeight: 700,
							padding: '2px 8px',
							borderRadius: '12px',
							background: 'rgba(37, 99, 235, 0.12)',
							color: '#1d4ed8',
						}}>
							ΔE₀₀ = {deltaResult.deltaE00}
						</span>
					</div>
					<div style={{ fontSize: '11px', color: 'var(--muted, #64748b)', fontWeight: 600 }}>
						{deltaResult.clinicalSummaryRu}
					</div>
				</div>

				{/* After Shade Card */}
				<button
					type="button"
					onClick={() => setActivePickerTarget('after')}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						background: activePickerTarget === 'after' ? 'var(--paper-strong, #ffffff)' : 'transparent',
						border: `2px solid ${activePickerTarget === 'after' ? 'var(--brand-500, #2563eb)' : 'transparent'}`,
						borderRadius: '8px',
						padding: '6px 10px',
						cursor: 'pointer',
						textAlign: 'left',
						minHeight: '44px',
					}}
				>
					<div
						style={{
							width: '32px',
							height: '32px',
							borderRadius: '6px',
							backgroundColor: `rgb(${currentAfterShade.rgb.r}, ${currentAfterShade.rgb.g}, ${currentAfterShade.rgb.b})`,
							boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
							flexShrink: 0,
						}}
					/>
					<div>
						<div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)' }}>ПОСЛЕ:</div>
						<div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink, #0f172a)' }}>
							{currentAfterShade.code}
						</div>
					</div>
				</button>
			</div>

			{/* Target Notification */}
			<div style={{
				fontSize: '12px',
				color: 'var(--muted, #64748b)',
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
			}}>
				<span>
					Выберите оттенок для <strong>{activePickerTarget === 'before' ? '«ДО лечения»' : '«ПОСЛЕ лечения»'}</strong>:
				</span>
				<span style={{ fontSize: '11px', fontWeight: 600 }}>
					{shadesList.length} оттенков в каталоге
				</span>
			</div>

			{/* Swatches Grid */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
				gap: '8px',
				maxHeight: '160px',
				overflowY: 'auto',
				padding: '2px',
			}}>
				{shadesList.map((shade) => {
					const isSelectedBefore = currentBeforeShade.code === shade.code;
					const isSelectedAfter = currentAfterShade.code === shade.code;
					const isCurrentActiveSelection = activePickerTarget === 'before' ? isSelectedBefore : isSelectedAfter;

					return (
						<button
							key={shade.code}
							type="button"
							onClick={() => handleSelectShade(shade.code)}
							title={`${shade.nameRu} (Светлота L*: ${shade.lab.L.toFixed(1)})`}
							style={{
								minHeight: '44px',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '3px',
								padding: '4px',
								borderRadius: '8px',
								border: isCurrentActiveSelection
									? '2px solid var(--brand-500, #2563eb)'
									: (isSelectedBefore || isSelectedAfter)
									? '2px dashed #94a3b8'
									: '1px solid var(--line, #cbd5e1)',
								background: isCurrentActiveSelection ? 'rgba(37, 99, 235, 0.08)' : 'var(--paper, #ffffff)',
								cursor: 'pointer',
								position: 'relative',
								transition: 'all 0.15s ease',
							}}
						>
							<div
								style={{
									width: '28px',
									height: '18px',
									borderRadius: '4px',
									backgroundColor: `rgb(${shade.rgb.r}, ${shade.rgb.g}, ${shade.rgb.b})`,
									boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
								}}
							/>
							<span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink, #0f172a)' }}>
								{shade.code}
							</span>

							{isCurrentActiveSelection && (
								<div style={{
									position: 'absolute',
									top: '-4px',
									right: '-4px',
									background: 'var(--brand-500, #2563eb)',
									color: '#ffffff',
									borderRadius: '50%',
									width: '14px',
									height: '14px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}>
									<Check size={9} />
								</div>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
};
