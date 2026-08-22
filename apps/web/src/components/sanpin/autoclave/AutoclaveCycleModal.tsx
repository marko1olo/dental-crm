import React, { useState, useEffect } from 'react';
import {
	X,
	Flame,
	Play,
	Square,
	Printer,
	FileSpreadsheet,
	Layers,
	ShieldCheck,
	CheckCircle2,
	AlertTriangle,
	Sparkles,
	Tag
} from 'lucide-react';
import {
	AutoclaveCycleId,
	AUTOCLAVE_CYCLES,
	CLINIC_AUTOCLAVES_PRESETS,
	getAutoclavePreset,
	AutoclaveCycleDefinition
} from './autoclavePresets';
import {
	SterilePackRecord,
	Form257SterilizerJournalEntry,
	createForm257JournalEntry,
	generateSterileBatchPacks
} from './autoclaveEngine';
import { AutoclaveSensorGauge } from './AutoclaveSensorGauge';
import { KraftPackBatchBuilder } from './KraftPackBatchBuilder';
import { KraftBarcodeLabelSheet } from './KraftBarcodeLabelSheet';
import { SanpinJournal257View } from './SanpinJournal257View';
import './autoclave.css';

export interface AutoclaveCycleModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCycleCompleted?: (entry: Form257SterilizerJournalEntry, packs: SterilePackRecord[]) => void;
	operatorName?: string;
	initialCycleId?: AutoclaveCycleId;
	initialAutoclaveId?: string;
}

type ModalTab = 'live_cycle' | 'batch_packs' | 'label_print' | 'journal_257';

export function AutoclaveCycleModal({
	isOpen,
	onClose,
	onCycleCompleted,
	operatorName = 'Смирнова О. И. (Медицинская сестра ЦСО)',
	initialCycleId = 'cycle_134_wrapped',
	initialAutoclaveId = 'AUTO-MELAG-01'
}: AutoclaveCycleModalProps) {
	const [activeTab, setActiveTab] = useState<ModalTab>('live_cycle');
	const [selectedCycleId, setSelectedCycleId] = useState<AutoclaveCycleId>(initialCycleId);
	const [selectedAutoclaveId, setSelectedAutoclaveId] = useState<string>(initialAutoclaveId);
	const [cycleNumber, setCycleNumber] = useState<number>(42);

	// Sensor state
	const [isCycleActive, setIsCycleActive] = useState(false);
	const [cycleStage, setCycleStage] = useState<
		'standby' | 'fractionated_vacuum' | 'heating' | 'sterilization_plateau' | 'venting' | 'vacuum_drying' | 'complete' | 'aborted'
	>('standby');
	const [currentTemp, setCurrentTemp] = useState<number>(24.0);
	const [currentPressure, setCurrentPressure] = useState<number>(0.0);
	const [elapsedPlateauMin, setElapsedPlateauMin] = useState<number>(0.0);

	// Batch packs & Journal entries
	const [packs, setPacks] = useState<SterilePackRecord[]>([]);
	const [journalEntries, setJournalEntries] = useState<Form257SterilizerJournalEntry[]>([]);

	const activeCycleDef: AutoclaveCycleDefinition = getAutoclavePreset(selectedCycleId);
	const activeAutoclave = CLINIC_AUTOCLAVES_PRESETS.find(a => a.id === selectedAutoclaveId) || CLINIC_AUTOCLAVES_PRESETS[0]!;

	// Initialize default batch on first open
	useEffect(() => {
		if (packs.length === 0) {
			const initialPacks = generateSterileBatchPacks({
				autoclaveId: selectedAutoclaveId,
				cycleNumber,
				packagingType: 'kraft_paper_sealed',
				packCount: 6,
				itemCategoryRu: 'Терапевтический базовый набор',
				itemsListRu: ['Зеркало', 'Зонд', 'Пинцет', 'Гладилка'],
				operatorName
			});
			setPacks(initialPacks);
		}
	}, [selectedAutoclaveId, cycleNumber, operatorName]);

	// Simulate cycle execution
	const handleStartCycle = () => {
		setIsCycleActive(true);
		setCycleStage('fractionated_vacuum');
		setCurrentTemp(45.0);
		setCurrentPressure(0.3);
		setElapsedPlateauMin(0.0);

		// Transition simulation steps
		setTimeout(() => {
			setCycleStage('heating');
			setCurrentTemp(110.0);
			setCurrentPressure(1.5);
		}, 600);

		setTimeout(() => {
			setCycleStage('sterilization_plateau');
			setCurrentTemp(activeCycleDef.targetTemperatureCelsius);
			setCurrentPressure(activeCycleDef.targetPressureBar);
			setElapsedPlateauMin(activeCycleDef.plateauTimeMinutes);
		}, 1200);

		setTimeout(() => {
			setCycleStage('vacuum_drying');
			setCurrentTemp(90.0);
			setCurrentPressure(0.1);
		}, 1800);

		setTimeout(() => {
			setCycleStage('complete');
			setIsCycleActive(false);

			// Automatically register in Form 257/u
			const entry = createForm257JournalEntry({
				autoclaveId: selectedAutoclaveId,
				deviceName: `${activeAutoclave.brand} ${activeAutoclave.model}`,
				cycleNumber,
				cycleId: selectedCycleId,
				measuredTemp: activeCycleDef.targetTemperatureCelsius,
				measuredPressure: activeCycleDef.targetPressureBar,
				measuredDurationMin: activeCycleDef.plateauTimeMinutes,
				loadDescriptionRu: packs.map(p => p.itemCategoryRu).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'Наборы инструментов',
				packCount: packs.length,
				packagingType: packs[0]?.packagingType || 'kraft_paper_sealed',
				indicatorType: activeCycleDef.mandatoryIndicators[1] || 'chemical_class5_integrating',
				isIndicatorPassed: true,
				operatorName
			});

			setJournalEntries(prev => [entry, ...prev]);
			if (onCycleCompleted) {
				onCycleCompleted(entry, packs);
			}
		}, 2400);
	};

	const handleAbortCycle = () => {
		setIsCycleActive(false);
		setCycleStage('aborted');
		setCurrentTemp(25.0);
		setCurrentPressure(0.0);
		setElapsedPlateauMin(0.0);
	};

	if (!isOpen) return null;

	return (
		<div className="autoclave-modal-overlay">
			<div className="autoclave-modal-container">
				{/* Modal Header */}
				<div className="autoclave-modal-header">
					<div className="autoclave-header-title">
						<Flame size={22} color="var(--brand-500, #3b82f6)" />
						<span>Стерилизационный автоклав Class B & СанПиН трекинг</span>
						<span className="autoclave-header-badge">СанПиН 3.3686-21</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="autoclave-btn"
						style={{ minHeight: '36px', minWidth: '36px', padding: '0.25rem', border: 'none' }}
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Body */}
				<div className="autoclave-modal-body">
					{/* Navigation Tabs */}
					<div className="autoclave-nav-tabs">
						<button
							type="button"
							className={`autoclave-tab-btn ${activeTab === 'live_cycle' ? 'active' : ''}`}
							onClick={() => setActiveTab('live_cycle')}
						>
							<Flame size={16} />
							1. Цикл стерилизации (Live)
						</button>
						<button
							type="button"
							className={`autoclave-tab-btn ${activeTab === 'batch_packs' ? 'active' : ''}`}
							onClick={() => setActiveTab('batch_packs')}
						>
							<Layers size={16} />
							2. Партия крафт-пакетов ({packs.length})
						</button>
						<button
							type="button"
							className={`autoclave-tab-btn ${activeTab === 'label_print' ? 'active' : ''}`}
							onClick={() => setActiveTab('label_print')}
						>
							<Printer size={16} />
							3. Печать этикеток (QR/Штрихкод)
						</button>
						<button
							type="button"
							className={`autoclave-tab-btn ${activeTab === 'journal_257' ? 'active' : ''}`}
							onClick={() => setActiveTab('journal_257')}
						>
							<FileSpreadsheet size={16} />
							4. Журнал Форма 257/у
						</button>
					</div>

					{/* TAB 1: LIVE CYCLE */}
					{activeTab === 'live_cycle' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
							{/* Apparatus Selector & Cycle Number */}
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem' }}>
								<div>
									<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
										Стерилизационный аппарат (Автоклав)
									</label>
									<select
										value={selectedAutoclaveId}
										onChange={e => setSelectedAutoclaveId(e.target.value)}
										disabled={isCycleActive}
										style={{ width: '100%', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
									>
										{CLINIC_AUTOCLAVES_PRESETS.map(app => (
											<option key={app.id} value={app.id}>
												{app.brand} {app.model} ({app.chamberVolumeLiters} л, {app.deviceClass.toUpperCase()})
											</option>
										))}
									</select>
								</div>
								<div>
									<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
										Ответственный оператор ЦСО
									</label>
									<input
										type="text"
										value={operatorName}
										readOnly
										style={{ width: '100%', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--surface, #f1f5f9)', color: 'var(--ink, #0f172a)' }}
									/>
								</div>
								<div>
									<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
										Цикл №
									</label>
									<input
										type="number"
										value={cycleNumber}
										onChange={e => setCycleNumber(parseInt(e.target.value) || 1)}
										disabled={isCycleActive}
										style={{ width: '90px', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
									/>
								</div>
							</div>

							{/* Cycle Cards */}
							<div>
								<div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.5rem' }}>
									Выберите режим стерилизации:
								</div>
								<div className="autoclave-cycles-grid">
									{Object.values(AUTOCLAVE_CYCLES).map(cycle => (
										<div
											key={cycle.id}
											className={`autoclave-cycle-card ${selectedCycleId === cycle.id ? 'selected' : ''}`}
											onClick={() => !isCycleActive && setSelectedCycleId(cycle.id)}
										>
											<div className="cycle-card-title">{cycle.shortLabelRu}</div>
											<div className="cycle-card-specs">
												<span className="cycle-spec-pill">{cycle.targetTemperatureCelsius}°C</span>
												<span className="cycle-spec-pill">{cycle.targetPressureBar} бар</span>
												<span className="cycle-spec-pill">{cycle.plateauTimeMinutes} мин</span>
											</div>
											<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginTop: '0.25rem' }}>
												{cycle.descriptionRu}
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Live Gauges */}
							<AutoclaveSensorGauge
								cycle={activeCycleDef}
								currentTemperature={currentTemp}
								currentPressure={currentPressure}
								elapsedPlateauMinutes={elapsedPlateauMin}
								isCycleActive={isCycleActive}
								cycleStage={cycleStage}
							/>

							{/* Execution Controls */}
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-strong, #f8fafc)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)' }}>
								<div style={{ fontSize: '0.8125rem', color: 'var(--muted, #64748b)' }}>
									Норматив: <strong>{activeCycleDef.sanpinNormRefRu}</strong>
								</div>
								<div style={{ display: 'flex', gap: '0.5rem' }}>
									{!isCycleActive ? (
										<button
											type="button"
											onClick={handleStartCycle}
											className="autoclave-btn autoclave-btn-primary"
										>
											<Play size={16} />
											Запустить цикл #{cycleNumber}
										</button>
									) : (
										<button
											type="button"
											onClick={handleAbortCycle}
											className="autoclave-btn autoclave-btn-bad"
										>
											<Square size={16} />
											Аварийная остановка
										</button>
									)}
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: BATCH PACKS */}
					{activeTab === 'batch_packs' && (
						<KraftPackBatchBuilder
							autoclaveId={selectedAutoclaveId}
							cycleNumber={cycleNumber}
							operatorName={operatorName}
							packs={packs}
							onPacksUpdated={setPacks}
						/>
					)}

					{/* TAB 3: LABEL PRINT */}
					{activeTab === 'label_print' && (
						<KraftBarcodeLabelSheet packs={packs} />
					)}

					{/* TAB 4: JOURNAL FORM 257/U */}
					{activeTab === 'journal_257' && (
						<SanpinJournal257View entries={journalEntries} />
					)}
				</div>
			</div>
		</div>
	);
}
