import React, { useState, useMemo } from 'react';
import { ArrowRight, Check, Search, X, Layers, Sparkles } from 'lucide-react';
import { ToothShadeGuide } from '../icons/DentalIcons';
import {
	VitaSystemType,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	calculateShadeDelta,
	getVitaShadeByCode,
	normalizeVitaShadeCode,
	ShadeDeltaResult,
} from './vitaShadesCatalog';
import {
	getStratificationPreset,
	STUMP_NATURAL_DIE_SHADES,
	SHADE_SWATCH_MAP,
	type StratificationZones,
} from '../lab/labShadesData';

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
	const [activePickerTarget, setActivePickerTarget] = useState<'before' | 'after'>('after');
	const [activeTabMode, setActiveTabMode] = useState<'primary' | 'stratification'>('primary');
	const [searchQuery, setSearchQuery] = useState('');

	// Internal stratification state fallback
	const [localBeforeStrat, setLocalBeforeStrat] = useState<VitaStratificationState>(() => {
		const preset = getStratificationPreset(beforeShadeCode, 'natural');
		return beforeStratification || { ...preset, stump: '' };
	});

	const [localAfterStrat, setLocalAfterStrat] = useState<VitaStratificationState>(() => {
		const preset = getStratificationPreset(afterShadeCode, 'natural');
		return afterStratification || { ...preset, stump: '' };
	});

	const activeStrat = activePickerTarget === 'before'
		? (beforeStratification || localBeforeStrat)
		: (afterStratification || localAfterStrat);

	const updateActiveStrat = (updates: Partial<VitaStratificationState>) => {
		if (activePickerTarget === 'before') {
			const next = { ...(beforeStratification || localBeforeStrat), ...updates };
			setLocalBeforeStrat(next);
			onBeforeStratificationChange?.(next);
		} else {
			const next = { ...(afterStratification || localAfterStrat), ...updates };
			setLocalAfterStrat(next);
			onAfterStratificationChange?.(next);
		}
	};

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
		const normalizedQ = normalizeVitaShadeCode(searchQuery).toLowerCase();
		const rawQ = searchQuery.trim().toLowerCase();
		return list.filter(s =>
			s.code.toLowerCase().includes(rawQ) ||
			s.code.toLowerCase().includes(normalizedQ) ||
			s.nameRu.toLowerCase().includes(rawQ)
		);
	}, [activeSystem, searchQuery]);

	const handleSelectShade = (code: string) => {
		if (activePickerTarget === 'before') {
			onBeforeShadeChange(code);
			const preset = getStratificationPreset(code, 'natural');
			updateActiveStrat({ body: code, cervical: preset.cervical, incisal: preset.incisal });
		} else {
			onAfterShadeChange(code);
			const preset = getStratificationPreset(code, 'natural');
			updateActiveStrat({ body: code, cervical: preset.cervical, incisal: preset.incisal });
		}
	};

	const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		setSearchQuery(raw);
		const normalized = normalizeVitaShadeCode(raw);
		const match = getVitaShadeByCode(normalized);
		if (match) {
			handleSelectShade(match.code);
		}
	};

	const applyStratPreset = (mode: 'natural' | 'monochrome' | 'youth_translucent') => {
		const baseCode = activePickerTarget === 'before' ? beforeShadeCode : afterShadeCode;
		const preset = getStratificationPreset(baseCode, mode);
		updateActiveStrat({
			cervical: preset.cervical,
			body: preset.body,
			incisal: preset.incisal,
		});
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
					<ToothShadeGuide size={18} style={{ color: 'var(--brand-500, #2563eb)' }} />
					<span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink, #0f172a)' }}>
						Определение цвета по шкале VITA (Колориметрия)
					</span>
				</div>

				<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
					{/* Mode Switcher: Primary vs Stratification */}
					<div style={{ display: 'flex', gap: '2px', background: 'var(--surface, #f1f5f9)', padding: '3px', borderRadius: '8px' }}>
						<button
							type="button"
							className={`photo-touch-btn ${activeTabMode === 'primary' ? 'primary' : ''}`}
							onClick={() => setActiveTabMode('primary')}
							style={{ minHeight: '34px', padding: '4px 10px', fontSize: '12px' }}
						>
							Основной тон
						</button>
						<button
							type="button"
							className={`photo-touch-btn ${activeTabMode === 'stratification' ? 'primary' : ''}`}
							onClick={() => setActiveTabMode('stratification')}
							style={{ minHeight: '34px', padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
						>
							<Layers size={13} />
							3 зоны & Культя
						</button>
					</div>

					{/* System Switcher */}
					<div style={{ display: 'flex', gap: '2px', background: 'var(--surface, #f1f5f9)', padding: '3px', borderRadius: '8px' }}>
						<button
							type="button"
							className={`photo-touch-btn ${activeSystem === 'classical' ? 'primary' : ''}`}
							onClick={() => setActiveSystem('classical')}
							style={{ minHeight: '34px', minWidth: '44px', padding: '4px 10px', fontSize: '12px' }}
						>
							VITA Classical
						</button>
						<button
							type="button"
							className={`photo-touch-btn ${activeSystem === '3d_master' ? 'primary' : ''}`}
							onClick={() => setActiveSystem('3d_master')}
							style={{ minHeight: '34px', minWidth: '44px', padding: '4px 10px', fontSize: '12px' }}
						>
							VITA 3D-Master
						</button>
					</div>
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
							color: deltaResult.isLighter ? 'var(--green, #15803d)' : 'var(--rust, #b91c1c)',
						}}>
							{deltaResult.deltaL >= 0 ? `+${deltaResult.deltaL}` : deltaResult.deltaL} ΔL*
						</span>
						<span style={{
							fontSize: '12px',
							fontWeight: 700,
							padding: '2px 8px',
							borderRadius: '12px',
							background: 'rgba(37, 99, 235, 0.12)',
							color: 'var(--teal-dark, #1d4ed8)',
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

			{/* Fast Search & Keyboard Normalization Bar (Mandates 8e, 8k) */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				width: '100%',
			}}>
				<div style={{
					position: 'relative',
					flex: 1,
					display: 'flex',
					alignItems: 'center',
				}}>
					<Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--muted, #64748b)', pointerEvents: 'none' }} />
					<input
						type="text"
						value={searchQuery}
						onChange={handleSearchInputChange}
						placeholder="Быстрый поиск или ввод кода (напр. А2, B1, 2M2, BL1, 0M2) — авто-нормализация..."
						aria-label="Поиск по шкале VITA"
						style={{
							width: '100%',
							minHeight: '36px',
							padding: '6px 30px 6px 30px',
							borderRadius: '8px',
							border: '1px solid var(--line, #cbd5e1)',
							background: 'var(--paper, #ffffff)',
							color: 'var(--ink, #0f172a)',
							fontSize: '12px',
							fontWeight: 600,
							outline: 'none',
						}}
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery('')}
							style={{
								position: 'absolute',
								right: '8px',
								background: 'transparent',
								border: 'none',
								color: 'var(--muted, #64748b)',
								cursor: 'pointer',
								padding: '4px',
							}}
							title="Очистить поиск"
							aria-label="Очистить"
						>
							<X size={14} />
						</button>
					)}
				</div>
				<span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted, #64748b)', whiteSpace: 'nowrap' }}>
					Выбор для: <strong>{activePickerTarget === 'before' ? '«ДО»' : '«ПОСЛЕ»'}</strong>
				</span>
			</div>

			{/* Mode A: Primary Shade Swatches Grid */}
			{activeTabMode === 'primary' && (
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
										? '2px dashed var(--muted, #94a3b8)'
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
										color: 'var(--paper, #ffffff)',
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
			)}

			{/* Mode B: 3-Zone Stratification & Stump Selector */}
			{activeTabMode === 'stratification' && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
					{/* 1-Click Stratification Presets */}
					<div style={{
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						flexWrap: 'wrap',
						background: 'var(--surface, #f8fafc)',
						padding: '8px 10px',
						borderRadius: '8px',
						border: '1px solid var(--line, #e2e8f0)',
					}}>
						<span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)' }}>
							1-Клик Пресет:
						</span>
						<button
							type="button"
							className="photo-touch-btn"
							onClick={() => applyStratPreset('natural')}
							style={{ minHeight: '32px', padding: '3px 8px', fontSize: '11px' }}
							title="Естественный переход (пришейка темнее, режущий край светлее)"
						>
							<Sparkles size={12} />
							Естественный градиент
						</button>
						<button
							type="button"
							className="photo-touch-btn"
							onClick={() => applyStratPreset('monochrome')}
							style={{ minHeight: '32px', padding: '3px 8px', fontSize: '11px' }}
							title="Монохромный тон (пришейка = тело = край)"
						>
							Монохром
						</button>
						<button
							type="button"
							className="photo-touch-btn"
							onClick={() => applyStratPreset('youth_translucent')}
							style={{ minHeight: '32px', padding: '3px 8px', fontSize: '11px' }}
							title="Молодежная прозрачность (усиленный край)"
						>
							Прозрачный край (эмалевое гало)
						</button>
					</div>

					{/* 3 Zones Grid */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
						{/* 1. Cervical */}
						<div style={{
							padding: '8px',
							borderRadius: '8px',
							border: '1px solid var(--line, #e2e8f0)',
							background: 'var(--paper, #ffffff)',
							display: 'flex',
							flexDirection: 'column',
							gap: '4px',
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)' }}>1. Пришейка:</span>
								<div style={{
									width: '14px',
									height: '14px',
									borderRadius: '50%',
									backgroundColor: SHADE_SWATCH_MAP[activeStrat.cervical]?.bg || '#efe2d0',
									border: '1px solid rgba(0,0,0,0.2)',
								}} />
							</div>
							<select
								value={activeStrat.cervical}
								onChange={(e) => updateActiveStrat({ cervical: e.target.value })}
								style={{
									width: '100%',
									minHeight: '32px',
									padding: '2px 6px',
									borderRadius: '6px',
									border: '1px solid var(--line, #cbd5e1)',
									background: 'var(--paper, #ffffff)',
									color: 'var(--ink, #0f172a)',
									fontSize: '11px',
									fontWeight: 700,
								}}
							>
								{VITA_CLASSICAL_SHADES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
								{VITA_3D_MASTER_SHADES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
							</select>
						</div>

						{/* 2. Body */}
						<div style={{
							padding: '8px',
							borderRadius: '8px',
							border: '1px solid var(--line, #e2e8f0)',
							background: 'var(--paper, #ffffff)',
							display: 'flex',
							flexDirection: 'column',
							gap: '4px',
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)' }}>2. Тело зуба:</span>
								<div style={{
									width: '14px',
									height: '14px',
									borderRadius: '50%',
									backgroundColor: SHADE_SWATCH_MAP[activeStrat.body]?.bg || '#f7f1e7',
									border: '1px solid rgba(0,0,0,0.2)',
								}} />
							</div>
							<select
								value={activeStrat.body}
								onChange={(e) => {
									const val = e.target.value;
									updateActiveStrat({ body: val });
									handleSelectShade(val);
								}}
								style={{
									width: '100%',
									minHeight: '32px',
									padding: '2px 6px',
									borderRadius: '6px',
									border: '1px solid var(--line, #cbd5e1)',
									background: 'var(--paper, #ffffff)',
									color: 'var(--ink, #0f172a)',
									fontSize: '11px',
									fontWeight: 700,
								}}
							>
								{VITA_CLASSICAL_SHADES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
								{VITA_3D_MASTER_SHADES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
							</select>
						</div>

						{/* 3. Incisal */}
						<div style={{
							padding: '8px',
							borderRadius: '8px',
							border: '1px solid var(--line, #e2e8f0)',
							background: 'var(--paper, #ffffff)',
							display: 'flex',
							flexDirection: 'column',
							gap: '4px',
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)' }}>3. Край (эмаль):</span>
								<div style={{
									width: '14px',
									height: '14px',
									borderRadius: '50%',
									backgroundColor: SHADE_SWATCH_MAP[activeStrat.incisal]?.bg || '#fdfdfb',
									border: '1px solid rgba(0,0,0,0.2)',
								}} />
							</div>
							<select
								value={activeStrat.incisal}
								onChange={(e) => updateActiveStrat({ incisal: e.target.value })}
								style={{
									width: '100%',
									minHeight: '32px',
									padding: '2px 6px',
									borderRadius: '6px',
									border: '1px solid var(--line, #cbd5e1)',
									background: 'var(--paper, #ffffff)',
									color: 'var(--ink, #0f172a)',
									fontSize: '11px',
									fontWeight: 700,
								}}
							>
								{VITA_CLASSICAL_SHADES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
								{VITA_3D_MASTER_SHADES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
							</select>
						</div>

						{/* 4. Stump (ND1–ND9) */}
						<div style={{
							padding: '8px',
							borderRadius: '8px',
							border: '1px solid var(--line, #e2e8f0)',
							background: 'var(--paper, #ffffff)',
							display: 'flex',
							flexDirection: 'column',
							gap: '4px',
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)' }}>Культя (ND):</span>
								<div style={{
									width: '14px',
									height: '14px',
									borderRadius: '50%',
									backgroundColor: (activeStrat.stump && SHADE_SWATCH_MAP[activeStrat.stump]?.bg) || '#efe2d0',
									border: '1px solid rgba(0,0,0,0.2)',
								}} />
							</div>
							<select
								value={activeStrat.stump || ''}
								onChange={(e) => updateActiveStrat({ stump: e.target.value })}
								style={{
									width: '100%',
									minHeight: '32px',
									padding: '2px 6px',
									borderRadius: '6px',
									border: '1px solid var(--line, #cbd5e1)',
									background: 'var(--paper, #ffffff)',
									color: 'var(--ink, #0f172a)',
									fontSize: '11px',
									fontWeight: 700,
								}}
							>
								<option value="">Не указана</option>
								{STUMP_NATURAL_DIE_SHADES.map(nd => (
									<option key={nd.id} value={nd.id}>{nd.name}</option>
								))}
							</select>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

