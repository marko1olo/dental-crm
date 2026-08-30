/**
 * Statutory Dental Laboratory Work Order & Tracking Studio Modal
 * Touch-First FDI Tooth Picker, Prosthetic Matrix, VITA Shades & Stump ND1-ND9, 7-Stage Pipeline & A4 Print Form.
 */

import React, { useState, useMemo } from 'react';
import {
	FlaskConical,
	Printer,
	Clock,
	Truck,
	DollarSign,
	Layers,
	Palette,
	X,
	Check,
	ShieldCheck,
	Crown,
	Gem,
	Sparkles,
	Wrench,
	Columns,
	Crosshair,
	Settings,
	Search,
	RotateCcw
} from 'lucide-react';
import './labWorkOrder.css';

const renderProstheticIcon = (iconId: string) => {
	switch (iconId) {
		case 'crown':
			return <Crown size={22} className="text-teal-600 dark:text-teal-400" />;
		case 'gem':
			return <Gem size={22} className="text-teal-600 dark:text-teal-400" />;
		case 'sparkles':
			return <Sparkles size={22} className="text-teal-600 dark:text-teal-400" />;
		case 'screw':
		case 'wrench':
			return <Wrench size={22} className="text-teal-600 dark:text-teal-400" />;
		case 'layers':
			return <Layers size={22} className="text-teal-600 dark:text-teal-400" />;
		case 'arch':
		case 'columns':
			return <Columns size={22} className="text-teal-600 dark:text-teal-400" />;
		case 'crosshair':
		case 'target':
			return <Crosshair size={22} className="text-teal-600 dark:text-teal-400" />;
		default:
			return <Layers size={22} className="text-teal-600 dark:text-teal-400" />;
	}
};

const renderStageIcon = (iconId: string) => {
	switch (iconId) {
		case 'settings':
		case 'in_progress':
			return <Settings size={18} />;
		case 'search':
		case 'fitting_scheduled':
			return <Search size={18} />;
		case 'check':
		case 'delivered_completed':
			return <Check size={18} />;
		case 'rotate-ccw':
		case 'correction_remake':
			return <RotateCcw size={18} />;
		default:
			return <Settings size={18} />;
	}
};
import {
	ProstheticTypeId,
	PROSTHETIC_TYPES,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	STUMP_SHADES_ND,
	SURFACE_TEXTURES,
	TRANSLUCENCY_LEVELS,
	LAB_WORKFLOW_STAGES,
	LAB_STAGE_ORDER,
	LabWorkflowStageId
} from './labWorkOrderPresets';
import {
	LabWorkOrder,
	calculateLabFinancials,
	calculateLabTurnaroundSchedule,
	generatePrintableLabWorkOrderHtml
} from './labWorkOrderEngine';

export interface LabWorkOrderModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrder?: LabWorkOrder | null | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTeeth?: number[] | undefined;
	readonly onSaveOrder?: ((order: LabWorkOrder) => void) | undefined;
}

type ModalTab = 'selection' | 'shades' | 'stages' | 'financials' | 'print';

export const LabWorkOrderModal: React.FC<LabWorkOrderModalProps> = ({
	isOpen,
	onClose,
	initialOrder,
	patientId = 'pat-001',
	patientName = 'Иванов Иван Иванович',
	patientChartNumber = 'К-8492',
	doctorId = 'doc-001',
	doctorName = 'Д-р Ковалев С. П.',
	initialTeeth = [21],
	onSaveOrder
}) => {
	const [activeTab, setActiveTab] = useState<ModalTab>('selection');

	// Order configuration state
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(
		initialOrder ? initialOrder.selectedTeeth : initialTeeth
	);
	const [prostheticType, setProstheticType] = useState<ProstheticTypeId>(
		initialOrder ? initialOrder.prostheticTypeId : 'crown_zirconia_monolithic'
	);
	const [materialId, setMaterialId] = useState<string>(
		initialOrder ? initialOrder.materialId : 'zirconia_katana_ml'
	);

	// Shade state
	const [shadeSystem, setShadeSystem] = useState<'classical' | '3d_master' | 'bleach'>(
		initialOrder ? initialOrder.shadeSystem : 'classical'
	);
	const [shadeCode, setShadeCode] = useState<string>(
		initialOrder ? initialOrder.shadeCode : 'A2'
	);
	const [stumpShadeCode, setStumpShadeCode] = useState<string>(
		initialOrder?.stumpShadeCode || 'ND2'
	);
	const [translucency, setTranslucency] = useState<'HT' | 'MT' | 'LT' | 'MO' | 'HO'>(
		initialOrder ? initialOrder.translucency : 'MT'
	);
	const [surfaceTexture, setSurfaceTexture] = useState<'high_gloss' | 'microtexture' | 'matte'>(
		initialOrder ? initialOrder.surfaceTexture : 'microtexture'
	);

	// Workflow Stage & Tracking
	const [currentStage, setCurrentStage] = useState<LabWorkflowStageId>(
		initialOrder ? initialOrder.currentStage : 'impression_sent'
	);
	const [stageNote, setStageNote] = useState<string>('');

	// Pricing & Financials
	const [pricePerUnit, setPricePerUnit] = useState<number>(
		initialOrder ? initialOrder.financials.pricePerUnitRub : PROSTHETIC_TYPES.crown_zirconia_monolithic.defaultPriceClinicRub
	);
	const [costPerUnit, setCostPerUnit] = useState<number>(
		initialOrder ? initialOrder.financials.costPerUnitRub : PROSTHETIC_TYPES.crown_zirconia_monolithic.defaultCostLabRub
	);
	const [doctorPercent, setDoctorPercent] = useState<number>(
		initialOrder ? initialOrder.financials.doctorPercent : 20
	);

	// Notes & Courier
	const [clinicalNotes, setClinicalNotes] = useState<string>(
		initialOrder?.clinicalNotes || ''
	);
	const [courierNumber, setCourierNumber] = useState<string>(
		initialOrder?.courier?.trackingNumber || ''
	);

	if (!isOpen) return null;

	const handleToothToggle = (toothNum: number) => {
		setSelectedTeeth((prev) => {
			if (prev.includes(toothNum)) {
				const next = prev.filter((t) => t !== toothNum);
				return next.length === 0 ? [toothNum] : next;
			}
			return [...prev, toothNum].sort((a, b) => a - b);
		});
	};

	const handleProstheticTypeChange = (typeId: ProstheticTypeId) => {
		setProstheticType(typeId);
		const preset = PROSTHETIC_TYPES[typeId];
		setMaterialId(preset.defaultMaterialId);
		setPricePerUnit(preset.defaultPriceClinicRub);
		setCostPerUnit(preset.defaultCostLabRub);
	};

	const financials = useMemo(() => {
		return calculateLabFinancials({
			unitsCount: selectedTeeth.length,
			pricePerUnitRub: pricePerUnit,
			costPerUnitRub: costPerUnit,
			doctorPercent
		});
	}, [selectedTeeth.length, pricePerUnit, costPerUnit, doctorPercent]);

	const schedule = useMemo(() => {
		return calculateLabTurnaroundSchedule({
			orderDate: initialOrder?.orderDateIso || new Date(),
			prostheticTypeId: prostheticType,
			currentDate: new Date()
		});
	}, [initialOrder, prostheticType]);

	const activeOrder: LabWorkOrder = useMemo(() => {
		const preset = PROSTHETIC_TYPES[prostheticType];
		return {
			id: initialOrder?.id || `lab-${Date.now()}`,
			orderNumber: initialOrder?.orderNumber || 'ЛО-2026/08-0142',
			patientId,
			patientName,
			patientChartNumber,
			doctorId,
			doctorName,
			clinicName: 'DENTE Clinic',
			labName: 'Центральная Лаборатория DENTE',
			selectedTeeth,
			prostheticTypeId: prostheticType,
			materialId,
			shadeSystem,
			shadeCode,
			stumpShadeCode: preset.requiresStumpShade ? stumpShadeCode : undefined,
			translucency,
			surfaceTexture,
			currentStage,
			stageHistory: initialOrder?.stageHistory || [
				{
					stage: currentStage,
					timestampIso: new Date().toISOString(),
					authorName: doctorName,
					note: stageNote || 'Статус обновлен в наряд-заказе'
				}
			],
			orderDateIso: initialOrder?.orderDateIso || schedule.orderDate,
			fittingDateIso: schedule.expectedFittingDate,
			deliveryDateIso: schedule.expectedDeliveryDate,
			financials,
			schedule,
			courier: courierNumber ? {
				courierService: 'DENTE Express Courier',
				trackingNumber: courierNumber,
				dispatchDate: schedule.orderDate,
				estimatedArrivalDate: schedule.expectedDeliveryDate
			} : undefined,
			clinicalNotes,
			createdAtIso: initialOrder?.createdAtIso || new Date().toISOString(),
			updatedAtIso: new Date().toISOString()
		};
	}, [
		initialOrder,
		patientId,
		patientName,
		patientChartNumber,
		doctorId,
		doctorName,
		selectedTeeth,
		prostheticType,
		materialId,
		shadeSystem,
		shadeCode,
		stumpShadeCode,
		translucency,
		surfaceTexture,
		currentStage,
		stageNote,
		financials,
		schedule,
		courierNumber,
		clinicalNotes
	]);

	const handleSave = () => {
		if (onSaveOrder) {
			onSaveOrder(activeOrder);
		}
		onClose();
	};

	const handlePrint = () => {
		const html = generatePrintableLabWorkOrderHtml(activeOrder);
		const printWin = window.open('', '_blank');
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		}
	};

	const upperRightTeeth = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperLeftTeeth = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRightTeeth = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerLeftTeeth = [31, 32, 33, 34, 35, 36, 37, 38];

	const activePreset = PROSTHETIC_TYPES[prostheticType];

	return (
		<div className="lab-order-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
			<div className="lab-order-modal-container" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<header className="lab-order-modal-header">
					<div className="lab-order-header-left">
						<div className="lab-order-title">
							<FlaskConical size={22} color="var(--teal, #0d9488)" />
							<span>Наряд-заказ в зуботехническую лабораторию</span>
						</div>
						<span className="lab-order-badge">{activeOrder.orderNumber}</span>
						<span className="lab-order-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-500, #3b82f6)' }}>
							{patientName} ({patientChartNumber})
						</span>
					</div>
					<button className="lab-btn" style={{ padding: '0.25rem 0.5rem', minHeight: '36px', minWidth: '36px' }} onClick={onClose} aria-label="Закрыть">
						<X size={20} />
					</button>
				</header>

				{/* Tabs Navigation */}
				<nav className="lab-order-tabs-nav">
					<button
						className={`lab-order-tab-btn ${activeTab === 'selection' ? 'active' : ''}`}
						onClick={() => setActiveTab('selection')}
					>
						<Layers size={16} />
						<span>1. Зубы и конструкция</span>
					</button>
					<button
						className={`lab-order-tab-btn ${activeTab === 'shades' ? 'active' : ''}`}
						onClick={() => setActiveTab('shades')}
					>
						<Palette size={16} />
						<span>2. Оттенки VITA и Культя</span>
					</button>
					<button
						className={`lab-order-tab-btn ${activeTab === 'stages' ? 'active' : ''}`}
						onClick={() => setActiveTab('stages')}
					>
						<Clock size={16} />
						<span>3. Этапы и курьер</span>
					</button>
					<button
						className={`lab-order-tab-btn ${activeTab === 'financials' ? 'active' : ''}`}
						onClick={() => setActiveTab('financials')}
					>
						<DollarSign size={16} />
						<span>4. Стоимость и маржа</span>
					</button>
					<button
						className={`lab-order-tab-btn ${activeTab === 'print' ? 'active' : ''}`}
						onClick={() => setActiveTab('print')}
					>
						<Printer size={16} />
						<span>5. Бланк А4 (Печать)</span>
					</button>
				</nav>

				{/* Modal Body */}
				<div className="lab-order-modal-body" style={{ paddingBottom: '4.5rem', maxHeight: '78vh', overflowY: 'auto' }}>
					{/* TAB 1: SELECTION */}
					{activeTab === 'selection' && (
						<>
							{/* 1-Click FDI Tooth Picker */}
							<div className="lab-odontogram-panel">
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
										Зубная формула FDI (1-Клик выбор зубов)
									</div>
									<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
										Выбрано: <strong>{selectedTeeth.join(', ')}</strong> ({selectedTeeth.length} ед.)
									</div>
								</div>

								{/* Desktop 2-arch layout */}
								<div className="lab-odontogram-grid hidden md:flex">
									{/* Upper Jaw */}
									<div className="lab-tooth-row">
										{upperRightTeeth.map((num) => (
											<button
												key={num}
												type="button"
												className={`lab-tooth-btn ${selectedTeeth.includes(num) ? 'selected' : ''}`}
												onClick={() => handleToothToggle(num)}
											>
												<span>{num}</span>
											</button>
										))}
										<div className="lab-tooth-divider" />
										{upperLeftTeeth.map((num) => (
											<button
												key={num}
												type="button"
												className={`lab-tooth-btn ${selectedTeeth.includes(num) ? 'selected' : ''}`}
												onClick={() => handleToothToggle(num)}
											>
												<span>{num}</span>
											</button>
										))}
									</div>

									{/* Lower Jaw */}
									<div className="lab-tooth-row">
										{lowerRightTeeth.map((num) => (
											<button
												key={num}
												type="button"
												className={`lab-tooth-btn ${selectedTeeth.includes(num) ? 'selected' : ''}`}
												onClick={() => handleToothToggle(num)}
											>
												<span>{num}</span>
											</button>
										))}
										<div className="lab-tooth-divider" />
										{lowerLeftTeeth.map((num) => (
											<button
												key={num}
												type="button"
												className={`lab-tooth-btn ${selectedTeeth.includes(num) ? 'selected' : ''}`}
												onClick={() => handleToothToggle(num)}
											>
												<span>{num}</span>
											</button>
										))}
									</div>
								</div>

								{/* Mobile 4-row quadrant layout (18-11, 21-28, 48-41, 31-38) */}
								<div className="flex md:hidden flex-col gap-2 w-full">
									<div className="space-y-1">
										<span className="text-[10px] font-bold text-[var(--muted,#64748b)]">Q1 (18–11) • Верхний правый</span>
										<div className="grid grid-cols-8 gap-1">
											{upperRightTeeth.map((num) => (
												<button
													key={num}
													type="button"
													className={`lab-tooth-btn !w-full !min-w-0 !h-9 text-xs font-bold ${selectedTeeth.includes(num) ? 'selected' : ''}`}
													onClick={() => handleToothToggle(num)}
												>
													<span>{num}</span>
												</button>
											))}
										</div>
									</div>

									<div className="space-y-1">
										<span className="text-[10px] font-bold text-[var(--muted,#64748b)]">Q2 (21–28) • Верхний левый</span>
										<div className="grid grid-cols-8 gap-1">
											{upperLeftTeeth.map((num) => (
												<button
													key={num}
													type="button"
													className={`lab-tooth-btn !w-full !min-w-0 !h-9 text-xs font-bold ${selectedTeeth.includes(num) ? 'selected' : ''}`}
													onClick={() => handleToothToggle(num)}
												>
													<span>{num}</span>
												</button>
											))}
										</div>
									</div>

									<div className="space-y-1">
										<span className="text-[10px] font-bold text-[var(--muted,#64748b)]">Q4 (48–41) • Нижний правый</span>
										<div className="grid grid-cols-8 gap-1">
											{lowerRightTeeth.map((num) => (
												<button
													key={num}
													type="button"
													className={`lab-tooth-btn !w-full !min-w-0 !h-9 text-xs font-bold ${selectedTeeth.includes(num) ? 'selected' : ''}`}
													onClick={() => handleToothToggle(num)}
												>
													<span>{num}</span>
												</button>
											))}
										</div>
									</div>

									<div className="space-y-1">
										<span className="text-[10px] font-bold text-[var(--muted,#64748b)]">Q3 (31–38) • Нижний левый</span>
										<div className="grid grid-cols-8 gap-1">
											{lowerLeftTeeth.map((num) => (
												<button
													key={num}
													type="button"
													className={`lab-tooth-btn !w-full !min-w-0 !h-9 text-xs font-bold ${selectedTeeth.includes(num) ? 'selected' : ''}`}
													onClick={() => handleToothToggle(num)}
												>
													<span>{num}</span>
												</button>
											))}
										</div>
									</div>
								</div>
							</div>

							{/* Prosthetic Types Matrix */}
							<div>
								<div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
									Вид ортопедической конструкции
								</div>
								<div className="lab-types-grid">
									{(Object.keys(PROSTHETIC_TYPES) as ProstheticTypeId[]).map((typeKey) => {
										const def = PROSTHETIC_TYPES[typeKey];
										const isSelected = prostheticType === typeKey;
										return (
											<div
												key={typeKey}
												className={`lab-type-card ${isSelected ? 'selected' : ''}`}
												onClick={() => handleProstheticTypeChange(typeKey)}
											>
												<span className="lab-type-icon">{renderProstheticIcon(def.icon)}</span>
												<div className="lab-type-details">
													<div className="lab-type-name">{def.shortNameRu}</div>
													<div className="lab-type-desc">{def.descriptionRu}</div>
													<div className="lab-type-meta">
														<span style={{ color: 'var(--teal, #0d9488)', fontWeight: 700 }}>
															{def.defaultPriceClinicRub.toLocaleString('ru-RU')} ₽ / ед.
														</span>
														<span style={{ color: 'var(--muted, #64748b)', display: 'inline-flex', alignItems: 'center' }}>
															<Clock size={12} className="inline mr-1 text-[var(--muted)]" />
															{def.standardTurnaroundWorkingDays} раб. дн.
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Clinical Notes Input */}
							<div>
								<label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
									Клинические пожелания и примечания технику
								</label>
								<textarea
									value={clinicalNotes}
									onChange={(e) => setClinicalNotes(e.target.value)}
									placeholder="Укажите особенности окклюзии, выраженность мамелонов, прозрачность режущего края, зенит десны..."
									rows={3}
									style={{
										width: '100%',
										padding: '0.5rem 0.75rem',
										borderRadius: '8px',
										border: '1px solid var(--line, #cbd5e1)',
										background: 'var(--paper, #ffffff)',
										color: 'var(--ink, #0f172a)',
										fontSize: '0.875rem'
									}}
								/>
							</div>

							<div style={{ height: '24px', flexShrink: 0 }} aria-hidden="true" />
						</>
					)}

					{/* TAB 2: SHADES & STUMP */}
					{activeTab === 'shades' && (
						<>
							{/* Shade System Tabs */}
							<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
								<span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Шкала оттенков:</span>
								<button
									type="button"
									className={`lab-btn ${shadeSystem === 'classical' ? 'lab-btn-primary' : ''}`}
									style={{ padding: '0.25rem 0.75rem', minHeight: '38px' }}
									onClick={() => { setShadeSystem('classical'); setShadeCode('A2'); }}
								>
									VITA Classical (A1–D4)
								</button>
								<button
									type="button"
									className={`lab-btn ${shadeSystem === '3d_master' ? 'lab-btn-primary' : ''}`}
									style={{ padding: '0.25rem 0.75rem', minHeight: '38px' }}
									onClick={() => { setShadeSystem('3d_master'); setShadeCode('2M2'); }}
								>
									VITA 3D-Master (1M1–5M3)
								</button>
								<button
									type="button"
									className={`lab-btn ${shadeSystem === 'bleach' ? 'lab-btn-primary' : ''}`}
									style={{ padding: '0.25rem 0.75rem', minHeight: '38px' }}
									onClick={() => { setShadeSystem('bleach'); setShadeCode('BL2'); }}
								>
									Bleach (BL1–BL4)
								</button>
							</div>

							{/* Swatches Grid */}
							<div>
								<div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
									Основной оттенок реставрации: <span style={{ color: 'var(--teal, #0d9488)' }}>{shadeCode}</span>
								</div>
								<div className="lab-swatches-grid">
									{shadeSystem === 'classical' && VITA_CLASSICAL_SHADES.map((s) => (
										<div
											key={s.code}
											className={`lab-swatch-chip ${shadeCode === s.code ? 'selected' : ''}`}
											onClick={() => setShadeCode(s.code)}
										>
											<div className="lab-swatch-color" style={{ background: s.hex }} />
											<span className="lab-swatch-code">{s.code}</span>
										</div>
									))}
									{shadeSystem === '3d_master' && VITA_3D_MASTER_SHADES.map((s) => (
										<div
											key={s.code}
											className={`lab-swatch-chip ${shadeCode === s.code ? 'selected' : ''}`}
											onClick={() => setShadeCode(s.code)}
										>
											<div className="lab-swatch-color" style={{ background: s.hex }} />
											<span className="lab-swatch-code">{s.code}</span>
										</div>
									))}
									{shadeSystem === 'bleach' && VITA_BLEACH_SHADES.map((s) => (
										<div
											key={s.code}
											className={`lab-swatch-chip ${shadeCode === s.code ? 'selected' : ''}`}
											onClick={() => setShadeCode(s.code)}
										>
											<div className="lab-swatch-color" style={{ background: s.hex }} />
											<span className="lab-swatch-code">{s.code}</span>
										</div>
									))}
								</div>
							</div>

							{/* Stump Shade (ND1-ND9) */}
							{activePreset.requiresStumpShade && (
								<div>
									<div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
										Цвет культи препарированного зуба (IPS Natural Die Material ND1–ND9): <span style={{ color: 'var(--teal, #0d9488)' }}>{stumpShadeCode}</span>
									</div>
									<div className="lab-swatches-grid">
										{STUMP_SHADES_ND.map((s) => (
											<div
												key={s.code}
												className={`lab-swatch-chip ${stumpShadeCode === s.code ? 'selected' : ''}`}
												onClick={() => setStumpShadeCode(s.code)}
												title={s.descriptionRu}
											>
												<div className="lab-swatch-color" style={{ background: s.hex }} />
												<span className="lab-swatch-code">{s.code}</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Translucency & Surface Texture */}
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
								<div>
									<label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
										Степень прозрачности (Translucency)
									</label>
									<select
										value={translucency}
										onChange={(e) => setTranslucency(e.target.value as 'HT' | 'MT' | 'LT' | 'MO' | 'HO')}
										style={{
											width: '100%',
											padding: '0.5rem',
											borderRadius: '6px',
											border: '1px solid var(--line, #cbd5e1)',
											background: 'var(--paper, #ffffff)',
											color: 'var(--ink, #0f172a)',
											minHeight: '44px'
										}}
									>
										{TRANSLUCENCY_LEVELS.map((t) => (
											<option key={t.id} value={t.id}>{t.nameRu}</option>
										))}
									</select>
								</div>
								<div>
									<label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.375rem' }}>
										Текстура поверхности (Surface Texture)
									</label>
									<select
										value={surfaceTexture}
										onChange={(e) => setSurfaceTexture(e.target.value as 'high_gloss' | 'microtexture' | 'matte')}
										style={{
											width: '100%',
											padding: '0.5rem',
											borderRadius: '6px',
											border: '1px solid var(--line, #cbd5e1)',
											background: 'var(--paper, #ffffff)',
											color: 'var(--ink, #0f172a)',
											minHeight: '44px'
										}}
									>
										{SURFACE_TEXTURES.map((st) => (
											<option key={st.id} value={st.id}>{st.nameRu}</option>
										))}
									</select>
								</div>
							</div>
						</>
					)}

					{/* TAB 3: STAGES & COURIER */}
					{activeTab === 'stages' && (
						<>
							{/* 7-Stage Pipeline */}
							<div>
								<div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem' }}>
									Клинический статус наряда ЗТЛ (4 статуса)
								</div>
								<div className="lab-pipeline-container">
									{LAB_STAGE_ORDER.map((stageKey) => {
										const stageDef = LAB_WORKFLOW_STAGES[stageKey];
										const currentIndex = LAB_WORKFLOW_STAGES[currentStage].orderIndex;
										const isCompleted = stageDef.orderIndex < currentIndex;
										const isActive = stageDef.orderIndex === currentIndex;

										return (
											<div
												key={stageKey}
												className={`lab-stage-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
												onClick={() => setCurrentStage(stageKey)}
											>
												<div className="lab-stage-icon-circle">
													{isCompleted ? <Check size={18} /> : renderStageIcon(stageDef.icon)}
												</div>
												<div className="lab-stage-label">{stageDef.shortTitleRu}</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Schedule & Deadline Alert Banner */}
							<div
								style={{
									background: 'var(--paper-strong, #f8fafc)',
									border: `1px solid ${schedule.colorToken}`,
									borderLeft: `4px solid ${schedule.colorToken}`,
									borderRadius: '8px',
									padding: '0.875rem',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center'
								}}
							>
								<div>
									<div style={{ fontWeight: 700, fontSize: '0.875rem', color: schedule.colorToken }}>
										{schedule.deadlineStatusRu} (Срок сдачи: {schedule.expectedDeliveryDate})
									</div>
									<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginTop: '0.25rem' }}>
										Рабочих дней: {schedule.workingDaysRequired} • CAD дизайн: {schedule.expectedCadDate} • Фрезеровка: {schedule.expectedMillingDate}
										{schedule.expectedFittingDate && ` • Примерка: ${schedule.expectedFittingDate}`}
									</div>
								</div>
								<span className="lab-order-badge" style={{ borderColor: schedule.colorToken, color: schedule.colorToken }}>
									{LAB_WORKFLOW_STAGES[currentStage].nameRu}
								</span>
							</div>

							{/* Courier Tracking */}
							<div style={{ background: 'var(--paper-strong, #f8fafc)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '1rem' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
									<Truck size={18} color="var(--teal, #0d9488)" />
									<span>Курьерская доставка лаборатории</span>
								</div>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
											Трек-номер курьерской накладной
										</label>
										<input
											type="text"
											value={courierNumber}
											onChange={(e) => setCourierNumber(e.target.value)}
											placeholder="например: LAB-EXP-94021"
											style={{
												width: '100%',
												padding: '0.5rem',
												borderRadius: '6px',
												border: '1px solid var(--line, #cbd5e1)',
												background: 'var(--paper, #ffffff)',
												color: 'var(--ink, #0f172a)',
												minHeight: '44px'
											}}
										/>
									</div>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
											Примечание к этапу / статус курьера
										</label>
										<input
											type="text"
											value={stageNote}
											onChange={(e) => setStageNote(e.target.value)}
											placeholder="например: Передано в доставку курьеру Алексею"
											style={{
												width: '100%',
												padding: '0.5rem',
												borderRadius: '6px',
												border: '1px solid var(--line, #cbd5e1)',
												background: 'var(--paper, #ffffff)',
												color: 'var(--ink, #0f172a)',
												minHeight: '44px'
											}}
										/>
									</div>
								</div>
							</div>
						</>
					)}

					{/* TAB 4: FINANCIALS */}
					{activeTab === 'financials' && (
						<>
							<div className="lab-financials-grid">
								<div className="lab-kpi-card">
									<div className="lab-kpi-title">Стоимость для пациента</div>
									<div className="lab-kpi-value" style={{ color: 'var(--teal, #0d9488)' }}>
										{financials.patientPriceTotalRub.toLocaleString('ru-RU')} ₽
									</div>
									<div className="lab-kpi-sub">
										{financials.pricePerUnitRub.toLocaleString('ru-RU')} ₽ × {financials.unitsCount} ед.
									</div>
								</div>

								<div className="lab-kpi-card">
									<div className="lab-kpi-title">Себестоимость лаборатории</div>
									<div className="lab-kpi-value" style={{ color: 'var(--bad, #ef4444)' }}>
										{financials.labCostTotalRub.toLocaleString('ru-RU')} ₽
									</div>
									<div className="lab-kpi-sub">
										{financials.costPerUnitRub.toLocaleString('ru-RU')} ₽ × {financials.unitsCount} ед.
									</div>
								</div>

								<div className="lab-kpi-card">
									<div className="lab-kpi-title">Валовая маржа (Profit)</div>
									<div className="lab-kpi-value" style={{ color: 'var(--ok, #10b981)' }}>
										{financials.grossMarginRub.toLocaleString('ru-RU')} ₽
									</div>
									<div className="lab-kpi-sub">
										Маржинальность: <strong>{financials.grossMarginPercent}%</strong>
									</div>
								</div>

								<div className="lab-kpi-card">
									<div className="lab-kpi-title">Комиссия врача ({financials.doctorPercent}%)</div>
									<div className="lab-kpi-value">
										{financials.doctorCommissionRub.toLocaleString('ru-RU')} ₽
									</div>
									<div className="lab-kpi-sub">
										Чистая прибыль клиники: <strong>{financials.clinicNetProfitRub.toLocaleString('ru-RU')} ₽</strong>
									</div>
								</div>
							</div>

							{/* Cost Adjustment Inputs */}
							<div style={{ background: 'var(--paper-strong, #f8fafc)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
								<div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
									Корректировка прайс-листа и комиссии
								</div>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
											Цена клиники за ед. (₽)
										</label>
										<input
											type="number"
											value={pricePerUnit}
											onChange={(e) => setPricePerUnit(Number(e.target.value) || 0)}
											style={{
												width: '100%',
												padding: '0.5rem',
												borderRadius: '6px',
												border: '1px solid var(--line, #cbd5e1)',
												background: 'var(--paper, #ffffff)',
												color: 'var(--ink, #0f172a)',
												minHeight: '44px'
											}}
										/>
									</div>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
											Себестоимость лаб. за ед. (₽)
										</label>
										<input
											type="number"
											value={costPerUnit}
											onChange={(e) => setCostPerUnit(Number(e.target.value) || 0)}
											style={{
												width: '100%',
												padding: '0.5rem',
												borderRadius: '6px',
												border: '1px solid var(--line, #cbd5e1)',
												background: 'var(--paper, #ffffff)',
												color: 'var(--ink, #0f172a)',
												minHeight: '44px'
											}}
										/>
									</div>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
											Процент врача (%)
										</label>
										<input
											type="number"
											value={doctorPercent}
											onChange={(e) => setDoctorPercent(Number(e.target.value) || 0)}
											style={{
												width: '100%',
												padding: '0.5rem',
												borderRadius: '6px',
												border: '1px solid var(--line, #cbd5e1)',
												background: 'var(--paper, #ffffff)',
												color: 'var(--ink, #0f172a)',
												minHeight: '44px'
											}}
										/>
									</div>
								</div>
							</div>
						</>
					)}

					{/* TAB 5: PRINT PREVIEW */}
					{activeTab === 'print' && (
						<div className="lab-print-preview-pane">
							<div dangerouslySetInnerHTML={{ __html: generatePrintableLabWorkOrderHtml(activeOrder) }} />
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<footer className="lab-order-modal-footer">
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<button type="button" className="lab-btn" onClick={handlePrint}>
							<Printer size={16} />
							<span>1-Клик Печать А4</span>
						</button>
						<span style={{ fontSize: '0.8125rem', color: 'var(--muted, #64748b)' }}>
							Итого: <strong>{financials.patientPriceTotalRub.toLocaleString('ru-RU')} ₽</strong> ({selectedTeeth.length} ед.)
						</span>
					</div>

					<div style={{ display: 'flex', gap: '0.5rem' }}>
						<button type="button" className="lab-btn" onClick={onClose}>
							Отмена
						</button>
						<button type="button" className="lab-btn lab-btn-primary" onClick={handleSave}>
							<ShieldCheck size={16} />
							<span>Сохранить наряд-заказ</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
