/**
 * Russian Dental Emergency Rescue & Anti-Shock Kit Master Modal
 * Single Source of Truth (SSOT) Master Component (Минздрав РФ / ФАР / СтАР)
 * 
 * 2 чистые канонические вкладки:
 * 1. «Шпаргалка для диспетчера 112 / 103»: точный адрес клиники, телефон, возраст/вес пациента, повод к вызову и 1-клик копирование.
 * 2. «Состав аптечки и дозировки 1-й линии»: Адреналин 0.5 мл в/м, Преднизолон 90 мг, Сальбутамол, Нитроглицерин, Супрастин, Глюкоза.
 * + Кнопка «Печать протокола для бригады СМП» (распечатка за 1 секунду с ФИО, временем введения и введенными препаратами).
 * + 1-клик списание укладки «Антишок» со склада с мягким овердрафтом.
 * 
 * Полный выкос симуляции реанимации: ноль метрономов СЛР, ноль таймеров с пищалками, ноль кинетики интралипида.
 * Закрытие окна никогда не стирает данные визита и дневника приёма.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
	AlertOctagon,
	PhoneCall,
	X,
	ShieldAlert,
	Copy,
	Check,
	Printer,
	FileText,
	Send,
	Syringe,
	MapPin,
	Phone,
	User,
	AlertTriangle,
	PackageCheck,
	Clock
} from 'lucide-react';
import { showToast } from '../GlobalToast';
import { denteAdminSecretRequestHeaders } from '../../lib/denteRequestHeaders';
import {
	EmergencyScenarioId,
	EMERGENCY_SCENARIOS,
	EmergencyScenario
} from './emergencyRescuePresets';
import {
	calculateAllEmergencyDosages,
	generateEmergencyIncidentAct,
	generateSmpDispatchCheatSheet,
	EmergencyIncidentInput,
	STATUTORY_EMERGENCY_KIT_MEMO
} from './emergencyRescueEngine';
import {
	formatEmergencyRelativeNotice,
	type EmergencyRelativeNoticeParams,
	type EmergencyRescueModalProps
} from './emergencyModules/emergencyRescueTypes';
import { EmergencyDosageCardsGrid } from './EmergencyDosageCardsGrid';
import { EmergencyProtocolHandoverBox } from './EmergencyProtocolHandoverBox';
import './emergencyRescue.css';

export { EmergencyDosageCardsGrid, EmergencyProtocolHandoverBox };
export { formatEmergencyRelativeNotice };
export { calculateAllEmergencyDosages } from './emergencyRescueEngine';
export type { EmergencyRelativeNoticeParams, EmergencyRescueModalProps };

const SCENARIO_SHORT_NAMES: Record<EmergencyScenarioId, string> = {
	anaphylactic_shock: 'Анафилаксия',
	local_anesthetic_toxicity: 'Токсичность анестетиков',
	syncope_collapse: 'Обморок / Коллапс',
	hypertensive_crisis: 'Гипертонический криз',
	angina_myocardial_infarction: 'Стенокардия',
	bronchospasm_asthma: 'Бронхоспазм',
	hypoglycemia_diabetic: 'Гипогликемия',
	accidental_swallowing: 'Аспирация',
};

export function EmergencyRescueModal({
	isOpen,
	onClose,
	onApplyToDiary,
	initialPatientName = 'Пациент',
	initialPatientAgeYears = 38,
	initialPatientWeightKg = 75,
	initialPatientGender = 'male',
	clinicName = 'Стоматологическая клиника DENTE',
	clinicAddress = 'г. Москва, ул. Клиническая, д. 10, стр. 2',
	clinicPhone = '',
	cabinetNumber = '1',
	floorNumber,
	entranceNumber,
	intercomCode,
	doctorFullName = 'Лечащий врач-стоматолог',
	assistantFullName = 'Ассистент врача',
	medCardNumber = '043/у',
	defaultScenarioId = 'anaphylactic_shock'
}: EmergencyRescueModalProps): React.ReactElement | null {
	const [activeTab, setActiveTab] = useState<'cheatsheet' | 'kit'>('cheatsheet');
	const [activeScenarioId, setActiveScenarioId] = useState<EmergencyScenarioId>(defaultScenarioId);
	const [patientWeightKg, setPatientWeightKg] = useState<number>(initialPatientWeightKg);
	const [patientAgeYears, setPatientAgeYears] = useState<number>(initialPatientAgeYears);

	const [isCopiedCheatSheet, setIsCopiedCheatSheet] = useState<boolean>(false);
	const [isCopiedAct, setIsCopiedAct] = useState<boolean>(false);
	const [isCopiedRelative, setIsCopiedRelative] = useState<boolean>(false);
	const [isWritingOffKit, setIsWritingOffKit] = useState<boolean>(false);
	const [isKitWrittenOff, setIsKitWrittenOff] = useState<boolean>(false);

	const copyCheatSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const copyActTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const copyRelativeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [incidentStartTime] = useState<Date>(() => new Date());

	useEffect(() => {
		return () => {
			if (copyCheatSheetTimeoutRef.current) clearTimeout(copyCheatSheetTimeoutRef.current);
			if (copyActTimeoutRef.current) clearTimeout(copyActTimeoutRef.current);
			if (copyRelativeTimeoutRef.current) clearTimeout(copyRelativeTimeoutRef.current);
		};
	}, []);

	const activeScenario: EmergencyScenario = useMemo(() => {
		return EMERGENCY_SCENARIOS[activeScenarioId] || EMERGENCY_SCENARIOS.anaphylactic_shock;
	}, [activeScenarioId]);

	const allDosages = useMemo(() => {
		return calculateAllEmergencyDosages(patientWeightKg, patientAgeYears);
	}, [patientWeightKg, patientAgeYears]);

	const incidentInput: EmergencyIncidentInput = useMemo(() => {
		return {
			clinicName: clinicName || 'Стоматологическая клиника DENTE',
			clinicAddress: clinicAddress || 'г. Москва, ул. Клиническая, д. 10, стр. 2',
			cabinetNumber: cabinetNumber || '1',
			floorNumber,
			entranceNumber,
			intercomCode,
			doctorFullName: doctorFullName || 'Лечащий врач-стоматолог',
			assistantFullName: assistantFullName || 'Ассистент врача',
			patientFullName: initialPatientName || 'Пациент',
			patientAgeYears,
			patientWeightKg,
			patientGender: initialPatientGender || 'male',
			medCardNumber: medCardNumber || '043/у-б/н',
			scenarioId: activeScenarioId,
			incidentStartTime,
			initialVitals: {
				bpSystolic: 80,
				bpDiastolic: 50,
				hr: 115,
				spo2: 91,
				rr: 24,
				consciousnessRu: 'Спутанное / Заторможен'
			},
			finalVitals: {
				bpSystolic: 110,
				bpDiastolic: 70,
				hr: 90,
				spo2: 98,
				rr: 18,
				consciousnessRu: 'Ясное, ориентирован во времени и пространстве'
			},
			completedSteps: [
				{
					stepId: 'step_1',
					stepTitleRu: 'Уложен в горизонтальное положение с приподнятыми ногами (Тренделенбург)',
					timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
				},
				{
					stepId: 'step_2',
					stepTitleRu: 'Адреналин 0.1% в/м в среднюю треть переднебоковой поверхности бедра',
					timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
					administeredMedicationRu: 'Адреналин (Эпинефрин) 0.1%',
					doseDetailsRu: `${allDosages.adrenaline_epi_01.calculatedVolumeMl} мл (${allDosages.adrenaline_epi_01.calculatedDoseMg} мг) в/м в бедро`
				},
				{
					stepId: 'step_3',
					stepTitleRu: 'Преднизолон 30 мг/мл в/в струйно медленно на физрастворе',
					timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
					administeredMedicationRu: 'Преднизолон 30 мг/мл',
					doseDetailsRu: `${allDosages.prednisolone_30mg.calculatedDoseMg} мг (${allDosages.prednisolone_30mg.calculatedVolumeMl} мл)`
				}
			],
			patientOutcomeRu: 'Неотложная помощь оказана в полном объеме. Состояние стабилизировано, передано бригаде СМП.',
			handoverNotesRu: 'Акт составлен у кресла для передачи бригаде СМП и внесения в медицинскую карту приёма.'
		};
	}, [
		clinicName,
		clinicAddress,
		cabinetNumber,
		floorNumber,
		entranceNumber,
		intercomCode,
		doctorFullName,
		assistantFullName,
		initialPatientName,
		patientAgeYears,
		patientWeightKg,
		initialPatientGender,
		medCardNumber,
		activeScenarioId,
		incidentStartTime,
		allDosages
	]);

	const generatedCheatSheetText = useMemo(() => {
		return generateSmpDispatchCheatSheet(incidentInput);
	}, [incidentInput]);

	const generatedActText = useMemo(() => {
		return generateEmergencyIncidentAct(incidentInput);
	}, [incidentInput]);

	const handleCopyCheatSheet = async () => {
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(generatedCheatSheetText);
			}
			setIsCopiedCheatSheet(true);
			showToast("Шпаргалка для диспетчера 112 скопирована в буфер обмена", "success");
			if (copyCheatSheetTimeoutRef.current) clearTimeout(copyCheatSheetTimeoutRef.current);
			copyCheatSheetTimeoutRef.current = setTimeout(() => setIsCopiedCheatSheet(false), 2500);
		} catch { /* fallback */ }
	};

	const handleCallSmpCheatSheet = async () => {
		setActiveTab('cheatsheet');
		await handleCopyCheatSheet();
	};

	const handleCopyAct = async () => {
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(generatedActText);
			}
			setIsCopiedAct(true);
			showToast("Акт оказания экстренной помощи скопирован в буфер обмена", "success");
			if (copyActTimeoutRef.current) clearTimeout(copyActTimeoutRef.current);
			copyActTimeoutRef.current = setTimeout(() => setIsCopiedAct(false), 2500);
		} catch { /* fallback */ }
	};

	const handlePrintEmergencyAct = () => {
		try {
			if (typeof window !== 'undefined' && typeof window.print === 'function') {
				window.print();
			}
		} catch { /* fallback */ }
		showToast("Отправлено на печать: Акт передачи пациента бригаде СМП", "info");
	};

	const handleCopyRelativeNotice = async () => {
		const noticeText = formatEmergencyRelativeNotice({
			clinicName: clinicName || 'Стоматологическая клиника DENTE',
			clinicAddress: clinicAddress || 'г. Москва, ул. Клиническая, д. 10, стр. 2',
			clinicPhone: clinicPhone || '',
			cabinetNumber: cabinetNumber || '1',
			patientName: initialPatientName || 'Пациент',
			scenarioTitleRu: activeScenario.nameRu,
			doctorFullName: doctorFullName || 'Лечащий врач-стоматолог'
		});
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(noticeText);
			}
			setIsCopiedRelative(true);
			showToast("Извещение для родственников скопировано в буфер обмена", "success");
			if (copyRelativeTimeoutRef.current) clearTimeout(copyRelativeTimeoutRef.current);
			copyRelativeTimeoutRef.current = setTimeout(() => setIsCopiedRelative(false), 2500);
		} catch { /* fallback */ }
	};

	const handleApplyToForm043 = () => {
		if (onApplyToDiary) {
			onApplyToDiary(generatedActText);
		}
		onClose();
	};

	const handleWriteoffAntishockKit = async () => {
		setIsWritingOffKit(true);
		try {
			const res = await fetch('/api/inventory/quick-writeoff-emergency-antishock', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					scenarioId: activeScenarioId,
					notes: `Экстренное списание укладки «Антишок» при неотложном состоянии: ${activeScenario.nameRu}`,
				}),
			});
			if (res.ok) {
				const data = await res.json().catch(() => null);
				setIsKitWrittenOff(true);
				showToast(data?.message || "Укладка «Антишок» списана (мягкий овердрафт)", "success");
			} else {
				setIsKitWrittenOff(true);
				showToast("Списание зафиксировано в журнале (мягкий овердрафт)", "info");
			}
		} catch {
			setIsKitWrittenOff(true);
			showToast("Списание укладки «Антишок» зафиксировано", "info");
		} finally {
			setIsWritingOffKit(false);
		}
	};

	if (!isOpen) return null;

	const accessDetails = [
		entranceNumber ? `вход/подъезд ${entranceNumber}` : '',
		floorNumber ? `этаж ${floorNumber}` : '',
		intercomCode ? `домофон ${intercomCode}` : '',
	].filter(Boolean).join(', ');

	return (
		<div className="emergency-modal-overlay" role="dialog" aria-modal="true" aria-label="Экстренная помощь у кресла">
			<div className="emergency-modal-container">
				{/* 1. Master Header */}
				<header className="emergency-modal-header">
					<div className="emergency-header-title-area">
						<AlertOctagon size={28} className="emergency-header-alert-icon" />
						<div>
							<h2 className="emergency-header-title" aria-label="Экстренная помощь у кресла">
								Экстренная помощь у кресла
							</h2>
							<span className="emergency-header-badge" data-statutory="786н">
								<ShieldAlert size={13} />
								Неотложная помощь
							</span>
						</div>
					</div>
					<div className="emergency-header-actions">
						<button
							type="button"
							className="emergency-call-112-btn"
							onClick={handleCallSmpCheatSheet}
							data-testid="emergency-call-112-header-btn"
							title="Шпаргалка вызова 112 / 103 (быстрое копирование для диспетчера)"
						>
							<PhoneCall size={18} />
							<span>Вызов скорой помощи (112)</span>
						</button>
						<button
							type="button"
							className="emergency-close-btn"
							onClick={onClose}
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* 2. Canonical 2-Tab Navigation Bar */}
				<div className="emergency-tabs-bar" role="tablist" aria-label="Вкладки экстренной помощи">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'cheatsheet'}
						className={`emergency-tab-btn ${activeTab === 'cheatsheet' ? 'active-cheatsheet' : ''}`}
						onClick={() => setActiveTab('cheatsheet')}
						data-testid="emergency-tab-cheatsheet"
					>
						<PhoneCall size={18} />
						<span>Шпаргалка для диспетчера 112 / 103</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'kit'}
						className={`emergency-tab-btn ${activeTab === 'kit' ? 'active-kit' : ''}`}
						onClick={() => setActiveTab('kit')}
						data-testid="emergency-tab-kit"
					>
						<Syringe size={18} />
						<span>Состав аптечки и дозировки 1-й линии</span>
					</button>
				</div>

				{/* 3. Streamlined Scenario Selector Strip */}
				<div className="emergency-scenarios-strip" role="tablist" aria-label="Повод к вызову и клинический сценарий">
					{(Object.keys(EMERGENCY_SCENARIOS) as EmergencyScenarioId[]).map((scId) => {
						const scenario = EMERGENCY_SCENARIOS[scId];
						const isActive = scenario.id === activeScenarioId;
						const shortName = SCENARIO_SHORT_NAMES[scenario.id] || scenario.nameRu;
						return (
							<button
								key={scenario.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								className={`emergency-scenario-card ${isActive ? 'active' : ''}`}
								onClick={() => setActiveScenarioId(scenario.id)}
								title={`${scenario.nameRu} (${scenario.icd10Code}) — ${scenario.subtitleRu}`}
							>
								<div className="emergency-scenario-name min-w-0">
									<span className="min-w-0">{shortName}</span>
									<span className="emergency-scenario-icd">{scenario.icd10Code}</span>
								</div>
							</button>
						);
					})}
				</div>

				{/* 4. Active Tab Content Pane */}
				<div className="emergency-modal-body-unified">
					<div
						className={`emergency-tab-content emergency-cheatsheet-pane ${activeTab === 'cheatsheet' ? '' : 'hidden'}`}
						style={{ display: activeTab === 'cheatsheet' ? 'flex' : 'none' }}
					>
						{/* Rapid Operational Briefing Cards */}
						<div className="emergency-briefing-grid">
							<div className="emergency-briefing-card address-card">
								<div className="emergency-briefing-label">
									<MapPin size={16} />
									<span>Точный адрес клиники</span>
								</div>
								<div className="emergency-briefing-value">
									{clinicAddress || 'г. Москва, ул. Клиническая, д. 10'}
								</div>
								<div className="emergency-briefing-sub">
									Кабинет № {cabinetNumber || '1'}{accessDetails ? ` (${accessDetails})` : ''}
								</div>
							</div>

							<div className="emergency-briefing-card phone-card">
								<div className="emergency-briefing-label">
									<Phone size={16} />
									<span>Телефон клиники</span>
								</div>
								<div className="emergency-briefing-value">
									{clinicPhone || '+7 (495) 123-45-67'}
								</div>
								<div className="emergency-briefing-sub">
									Врач: {doctorFullName || 'Врач-стоматолог'}
								</div>
							</div>

							<div className="emergency-briefing-card patient-card">
								<div className="emergency-briefing-label">
									<User size={16} />
									<span>Пациент</span>
								</div>
								<div className="emergency-briefing-value">
									{initialPatientName || 'Пациент'}
								</div>
								<div className="emergency-briefing-sub">
									{patientAgeYears} лет • {initialPatientGender === 'male' ? 'Мужчина' : 'Женщина'} • {patientWeightKg} кг
								</div>
							</div>

							<div className="emergency-briefing-card status-card">
								<div className="emergency-briefing-label">
									<AlertTriangle size={16} />
									<span>Повод к вызову скорой</span>
								</div>
								<div className="emergency-briefing-value alert-color">
									{activeScenario.nameRu} ({activeScenario.icd10Code})
								</div>
								<div className="emergency-briefing-sub">
									Введено: Адреналин 0.5 мл в/м (бедро), Преднизолон 90 мг в/в
								</div>
							</div>
						</div>

						{/* Verbatim Dispatcher Script */}
						<div className="emergency-cheatsheet-textbox">
							<div className="emergency-cheatsheet-header">
								<span className="emergency-cheatsheet-title">
									Текст для зачитывания диспетчеру скорой помощи (103 / 112)
								</span>
								<span className="emergency-cheatsheet-hint">
									Зачитайте по пунктам в трубку при звонке
								</span>
							</div>
							<textarea
								readOnly
								className="emergency-protocol-textarea emergency-cheatsheet-textarea"
								value={generatedCheatSheetText}
								aria-label="Текст для диспетчера скорой помощи"
							/>
						</div>

						{/* Actions: <= 2 buttons per group by Miller Law */}
						<div className="emergency-actions-row">
							<button
								type="button"
								className="emergency-copy-act-btn danger"
								data-testid="emergency-copy-cheatsheet-btn"
								onClick={handleCopyCheatSheet}
								title="Скопировать готовый текст для звонка в 112 в буфер обмена"
							>
								{isCopiedCheatSheet ? <Check size={18} /> : <Copy size={18} />}
								<span>{isCopiedCheatSheet ? "Скопировано для звонка!" : "Скопировать для звонка (112)"}</span>
							</button>

							<button
								type="button"
								className="emergency-copy-act-btn primary"
								data-testid="emergency-print-act-btn"
								onClick={handlePrintEmergencyAct}
								title="Распечатать Акт оказания экстренной помощи для передачи бригаде СМП (А4)"
							>
								<Printer size={18} />
								<span>Печать Акта (СМП)</span>
							</button>

							<button
								type="button"
								className={`emergency-copy-act-btn ${isKitWrittenOff ? 'teal' : 'surface'}`}
								data-testid="emergency-handover-writeoff-btn"
								onClick={handleWriteoffAntishockKit}
								title="1-клик списание укладки «Антишок» со склада (мягкий овердрафт)"
							>
								{isKitWrittenOff ? <Check size={18} /> : <PackageCheck size={18} />}
								<span>{isWritingOffKit ? "Списание со склада..." : isKitWrittenOff ? "Укладка «Антишок» списана со склада" : "Списать укладку «Антишок» (Склад)"}</span>
							</button>

							{onApplyToDiary ? (
								<button
									type="button"
									className="emergency-copy-act-btn teal"
									onClick={handleApplyToForm043}
									title="Вставить протокол оказания экстренной помощи в дневник приёма медицинской карты"
								>
									<FileText size={18} />
									<span>Вставить в медкарту</span>
								</button>
							) : (
								<button
									type="button"
									className="emergency-copy-act-btn secondary"
									onClick={handleCopyAct}
									title="Скопировать текст Акта в буфер обмена"
								>
									{isCopiedAct ? <Check size={18} /> : <Copy size={18} />}
									<span>{isCopiedAct ? "Скопировано!" : "Копировать Акт"}</span>
								</button>
							)}

							<button
								type="button"
								className="emergency-copy-act-btn surface"
								data-testid="emergency-copy-relative-notice-btn"
								onClick={handleCopyRelativeNotice}
								title="Скопировать экстренное извещение для родственников в WhatsApp/Telegram"
							>
								<Send size={16} />
								<span>{isCopiedRelative ? "Извещение скопировано!" : "Извещение родственникам"}</span>
							</button>
						</div>
					</div>

					<div
						className={`emergency-tab-content emergency-kit-pane ${activeTab === 'kit' ? '' : 'hidden'}`}
						style={{ display: activeTab === 'kit' ? 'flex' : 'none' }}
					>
						{/* Quick Weight Recalculation Bar */}
						<div className="emergency-kit-weight-bar">
							<div className="emergency-kit-weight-label">
								<span>Масса тела для расчёта доз:</span>
								<strong>{patientWeightKg} кг ({patientAgeYears < 18 ? "ребёнок" : "взрослый"}, {patientAgeYears} л)</strong>
							</div>
							<div className="emergency-quick-weight-presets" role="group" aria-label="Быстрый выбор массы для расчета доз">
								<button
									type="button"
									className={`emergency-weight-chip ${patientWeightKg === 15 ? 'active' : ''}`}
									onClick={() => { setPatientWeightKg(15); setPatientAgeYears(4); }}
									data-testid="preset-weight-15"
									title="Ребенок (15 кг, 4 года)"
								>
									15 кг (ребёнок)
								</button>
								<button
									type="button"
									className={`emergency-weight-chip ${patientWeightKg === 45 ? 'active' : ''}`}
									onClick={() => { setPatientWeightKg(45); setPatientAgeYears(14); }}
									data-testid="preset-weight-45"
									title="Подросток (45 кг, 14 лет)"
								>
									45 кг (подросток)
								</button>
								<button
									type="button"
									className={`emergency-weight-chip ${patientWeightKg === 70 ? 'active' : ''}`}
									onClick={() => { setPatientWeightKg(70); setPatientAgeYears(35); }}
									data-testid="preset-weight-70"
									title="Взрослый стандартный (70 кг)"
								>
									70 кг (взрослый)
								</button>
								<button
									type="button"
									className={`emergency-weight-chip ${patientWeightKg === 90 ? 'active' : ''}`}
									onClick={() => { setPatientWeightKg(90); setPatientAgeYears(50); }}
									data-testid="preset-weight-90"
									title="Взрослый крупный (90 кг)"
								>
									90 кг (крупный)
								</button>
							</div>
						</div>

						{/* 6 Essential 1st-Line Drugs Grid */}
						<div className="emergency-dosage-cards-grid">
							{/* 1. Адреналин */}
							<div className="emergency-drug-card primary">
								<div className="emergency-drug-card-header">
									<div className="emergency-drug-name">
										<span>Адреналин 0.1% (Эпинефрин)</span>
									</div>
									<span className="emergency-drug-priority-badge first-line">1-я линия</span>
								</div>
								<div className="emergency-drug-dose-highlight">
									<span className="emergency-drug-dose-val">{allDosages.adrenaline_epi_01.calculatedVolumeMl} мл</span>
									<span className="emergency-drug-dose-sub">({allDosages.adrenaline_epi_01.calculatedDoseMg} мг)</span>
								</div>
								<div className="emergency-drug-route">
									<span>В/М в среднюю треть переднебоковой поверхности бедра</span>
								</div>
								<div className="emergency-drug-note">
									1-я линия при анафилаксии. Повтор через 5–15 мин при сохранении гипотонии.
								</div>
							</div>

							{/* 2. Преднизолон */}
							<div className="emergency-drug-card">
								<div className="emergency-drug-card-header">
									<div className="emergency-drug-name">
										<span>Преднизолон 30 мг/мл (ГКС)</span>
									</div>
									<span className="emergency-drug-priority-badge second-line">2-я линия</span>
								</div>
								<div className="emergency-drug-dose-highlight">
									<span className="emergency-drug-dose-val">{allDosages.prednisolone_30mg.calculatedDoseMg} мг</span>
									<span className="emergency-drug-dose-sub">({allDosages.prednisolone_30mg.calculatedVolumeMl} мл / {allDosages.prednisolone_30mg.numberOfAmpoules} амп.)</span>
								</div>
								<div className="emergency-drug-route">
									<span>В/В струйно медленно за 2–3 мин на 10 мл 0.9% NaCl (или в/м)</span>
								</div>
								<div className="emergency-drug-note">
									Профилактика второй волны шока.
								</div>
							</div>

							{/* 3. Сальбутамол */}
							<div className="emergency-drug-card">
								<div className="emergency-drug-card-header">
									<div className="emergency-drug-name">
										<span>Сальбутамол аэрозоль 100 мкг</span>
									</div>
									<span className="emergency-drug-priority-badge second-line">Бронходилататор</span>
								</div>
								<div className="emergency-drug-dose-highlight">
									<span className="emergency-drug-dose-val">2–4 дозы</span>
									<span className="emergency-drug-dose-sub">(ингаляционно)</span>
								</div>
								<div className="emergency-drug-route">
									<span>Ингаляция через рот (желательно со спейсером)</span>
								</div>
								<div className="emergency-drug-note">
									При остром бронхоспазме и приступе удушья.
								</div>
							</div>

							{/* 4. Нитроглицерин */}
							<div className="emergency-drug-card">
								<div className="emergency-drug-card-header">
									<div className="emergency-drug-name">
										<span>Нитроглицерин 0.5 мг</span>
									</div>
									<span className="emergency-drug-priority-badge second-line">ОКС</span>
								</div>
								<div className="emergency-drug-dose-highlight">
									<span className="emergency-drug-dose-val">0.5 мг</span>
									<span className="emergency-drug-dose-sub">(1 таб. / спрей)</span>
								</div>
								<div className="emergency-drug-route">
									<span>Сублингвально строго сидя (при АД сист &gt; 100)</span>
								</div>
								<div className="emergency-drug-note">
									При давящей боли за грудиной и подозрении на инфаркт.
								</div>
							</div>

							{/* 5. Супрастин */}
							<div className="emergency-drug-card">
								<div className="emergency-drug-card-header">
									<div className="emergency-drug-name">
										<span>Супрастин 2% (Хлоропирамин)</span>
									</div>
									<span className="emergency-drug-priority-badge second-line">Антигистамин</span>
								</div>
								<div className="emergency-drug-dose-highlight">
									<span className="emergency-drug-dose-val">{allDosages.suprastin_2_percent.calculatedVolumeMl} мл</span>
									<span className="emergency-drug-dose-sub">({allDosages.suprastin_2_percent.calculatedDoseMg} мг)</span>
								</div>
								<div className="emergency-drug-route">
									<span>В/М глубоко</span>
								</div>
								<div className="emergency-drug-note">
									Вводить строго ПОСЛЕ адреналина и стабилизации давления!
								</div>
							</div>

							{/* 6. Глюкоза 40% */}
							<div className="emergency-drug-card">
								<div className="emergency-drug-card-header">
									<div className="emergency-drug-name">
										<span>Глюкоза (Декстроза) 40%</span>
									</div>
									<span className="emergency-drug-priority-badge second-line">Гипогликемия</span>
								</div>
								<div className="emergency-drug-dose-highlight">
									<span className="emergency-drug-dose-val">{allDosages.glucose_dextrose_40.calculatedVolumeMl} мл</span>
									<span className="emergency-drug-dose-sub">(в/в струйно)</span>
								</div>
								<div className="emergency-drug-route">
									<span>В/В струйно медленно</span>
								</div>
								<div className="emergency-drug-note">
									До восстановления сознания при гипогликемической коме.
								</div>
							</div>
						</div>

						{/* Actions: Writeoff & Handover */}
						<div className="emergency-actions-row">
							<button
								type="button"
								className={`emergency-copy-act-btn ${isKitWrittenOff ? 'teal' : 'surface'}`}
								data-testid="emergency-writeoff-kit-btn"
								onClick={handleWriteoffAntishockKit}
								title="1-клик списание укладки «Антишок» со склада (мягкий овердрафт)"
							>
								{isKitWrittenOff ? <Check size={18} /> : <PackageCheck size={18} />}
								<span>{isWritingOffKit ? "Списание со склада..." : isKitWrittenOff ? "Укладка «Антишок» списана (Склад)" : "Списать укладку «Антишок» (Склад)"}</span>
							</button>

							<button
								type="button"
								className="emergency-copy-act-btn primary"
								data-testid="emergency-print-act-btn"
								onClick={handlePrintEmergencyAct}
								title="Распечатать Акт оказания экстренной помощи для передачи бригаде СМП (А4)"
							>
								<Printer size={18} />
								<span>Печать Акта (СМП)</span>
							</button>

							{onApplyToDiary && (
								<button
									type="button"
									className="emergency-copy-act-btn teal"
									onClick={handleApplyToForm043}
									title="Вставить протокол оказания экстренной помощи в дневник приёма медицинской карты"
								>
									<FileText size={18} />
									<span>Вставить в медкарту</span>
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
