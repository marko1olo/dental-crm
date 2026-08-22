import React, { useState, useMemo } from "react";
import {
	FileText,
	Calendar,
	AlertTriangle,
	ShieldCheck,
	CheckCircle2,
	Copy,
	Printer,
	Send,
	Plus,
	Trash2,
	X,
	Sparkles,
	Building2,
	UserCheck,
	Stethoscope,
	Check
} from "lucide-react";
import {
	IncapacityReasonCode,
	IncapacityRegimeType,
	SickLeaveClosingCode,
	RegimeViolationCode,
	INCAPACITY_REASON_CODES,
	SICK_LEAVE_CLOSING_CODES,
	REGIME_VIOLATION_CODES,
	DENTAL_CLINICAL_PRESETS,
	DEFAULT_COMMISSION_PRESETS
} from "./sickLeaveElnPresets";
import {
	SickLeaveFormState,
	SickLeavePatientData,
	IncapacityPeriod,
	MedicalCommissionProtocol,
	calculateDaysBetween,
	formatDateRu,
	addDays,
	calculateSickLeaveDates,
	generateElnNumber,
	validateSickLeaveDuration,
	generateElnXmlPayload,
	generateElnJsonPayload,
	generateForm036uEntry,
	generateSickLeavePatientMemoHtml,
	generateEmrDiarySnippet,
	DEFAULT_CLINIC_NAME,
	DEFAULT_CLINIC_OGRN,
	DEFAULT_CLINIC_ADDRESS,
	DEFAULT_CLINIC_LICENCE,
	SINGLE_DOCTOR_MAX_DAYS
} from "./sickLeaveElnEngine";
import "./sickLeaveEln.css";

export interface SickLeaveElnModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApplyToDiary?: ((diarySnippet: string, form: SickLeaveFormState) => void) | undefined;
	initialPatientName?: string | undefined;
	initialPatientBirthDate?: string | undefined;
	initialPatientSnils?: string | undefined;
	initialPatientGender?: 'male' | 'female' | undefined;
	initialEmployerName?: string | undefined;
	initialDiagnosisText?: string | undefined;
	initialIcd10Code?: string | undefined;
	initialDoctorFio?: string | undefined;
	initialDoctorSnils?: string | undefined;
	initialDoctorSpecialty?: string | undefined;
}

type TabType = 'eln_form' | 'vk_protocol' | 'journal_036' | 'patient_memo' | 'xml_sfr';

export function SickLeaveElnModal({
	isOpen,
	onClose,
	onApplyToDiary,
	initialPatientName = 'Иванов Иван Иванович',
	initialPatientBirthDate = '1988-05-14',
	initialPatientSnils = '154-823-912 60',
	initialPatientGender = 'male',
	initialEmployerName = 'ООО "ТехноПромСервис"',
	initialDiagnosisText = 'Острый гнойный периостит нижней челюсти от зуба 4.6',
	initialIcd10Code = 'K10.2',
	initialDoctorFio = 'Соколов Андрей Михайлович',
	initialDoctorSnils = '139-204-857 44',
	initialDoctorSpecialty = 'Врач-стоматолог-хирург'
}: SickLeaveElnModalProps) {
	const todayStr: string = useMemo(() => new Date().toISOString().split('T')[0] ?? '2026-08-22', []);
	const [activeTab, setActiveTab] = useState<TabType>('eln_form');
	const [selectedPresetId, setSelectedPresetId] = useState<string>('acute_purulent_periostitis');
	const [isSfrSent, setIsSfrSent] = useState<boolean>(false);
	const [isCopiedDiary, setIsCopiedDiary] = useState<boolean>(false);
	const [isCopiedXml, setIsCopiedXml] = useState<boolean>(false);

	// Patient Data State
	const [patientData, setPatientData] = useState<SickLeavePatientData>({
		patientFio: initialPatientName,
		patientBirthDate: initialPatientBirthDate,
		patientGender: initialPatientGender,
		patientSnils: initialPatientSnils,
		patientOmsNumber: '7753210984001234',
		patientPassport: '45 12 893450',
		employerName: initialEmployerName,
		isPrimaryWorkplace: true,
		patientPhone: '+7 (999) 234-56-78'
	});

	// Form State
	const [formState, setFormState] = useState<SickLeaveFormState>(() => {
		const initDates = calculateSickLeaveDates(todayStr, 5);
		const initialPeriod: IncapacityPeriod = {
			id: 'p-1',
			dateFrom: initDates.dateFrom,
			dateTo: initDates.dateTo,
			doctorSpecialty: initialDoctorSpecialty,
			doctorFio: initialDoctorFio,
			doctorSnils: initialDoctorSnils,
			doctorRole: 'attending'
		};

		return {
			elnNumber: generateElnNumber(),
			issueDate: todayStr,
			isDuplicate: false,
			reasonCode: '01',
			regimeType: 'ambulatory',
			icd10Code: initialIcd10Code,
			diagnosisText: initialDiagnosisText,
			periods: [initialPeriod],
			closingCode: '31',
			workResumeDate: initDates.workResumeDate,
			isVkRequired: false,
			organizationName: DEFAULT_CLINIC_NAME,
			organizationOgrn: DEFAULT_CLINIC_OGRN,
			organizationAddress: DEFAULT_CLINIC_ADDRESS,
			medicalLicenceNumber: DEFAULT_CLINIC_LICENCE
		};
	});

	// Synchronize when preset is selected
	const handleApplyPreset = (presetKey: string) => {
		const preset = DENTAL_CLINICAL_PRESETS[presetKey];
		if (!preset) return;
		setSelectedPresetId(presetKey);

		const isVk = preset.isVkMandatory || preset.defaultDays > SINGLE_DOCTOR_MAX_DAYS;
		const startDate = formState.issueDate || todayStr;
		const initDates = calculateSickLeaveDates(startDate, preset.defaultDays);

		let newPeriods: IncapacityPeriod[] = [];

		if (isVk) {
			// Split into attending period (15 days) and VK extension period
			const p1Dates = calculateSickLeaveDates(startDate, 15);
			const p1: IncapacityPeriod = {
				id: 'p-1',
				dateFrom: p1Dates.dateFrom,
				dateTo: p1Dates.dateTo,
				doctorSpecialty: initialDoctorSpecialty,
				doctorFio: initialDoctorFio,
				doctorSnils: initialDoctorSnils,
				doctorRole: 'attending'
			};

			const remainingDays = preset.defaultDays - 15;
			const p2Start = addDays(p1Dates.dateTo, 1);
			const p2Dates = calculateSickLeaveDates(p2Start, remainingDays);
			const chair = DEFAULT_COMMISSION_PRESETS[0];
			const p2: IncapacityPeriod = {
				id: 'p-2',
				dateFrom: p2Dates.dateFrom,
				dateTo: p2Dates.dateTo,
				doctorSpecialty: initialDoctorSpecialty,
				doctorFio: initialDoctorFio,
				doctorSnils: initialDoctorSnils,
				doctorRole: 'vk_member',
				vkChairpersonFio: chair ? chair.fio : 'Иванова Е.В.',
				vkChairpersonSnils: chair ? chair.snils : '142-876-543 89',
				vkProtocolNumber: 'ВК-84/2026',
				vkProtocolDate: p1Dates.dateTo
			};
			newPeriods = [p1, p2];
		} else {
			const p1: IncapacityPeriod = {
				id: 'p-1',
				dateFrom: initDates.dateFrom,
				dateTo: initDates.dateTo,
				doctorSpecialty: initialDoctorSpecialty,
				doctorFio: initialDoctorFio,
				doctorSnils: initialDoctorSnils,
				doctorRole: 'attending'
			};
			newPeriods = [p1];
		}

		const chairPreset = DEFAULT_COMMISSION_PRESETS[0];
		const deputyPreset = DEFAULT_COMMISSION_PRESETS[1];
		const memberPreset = DEFAULT_COMMISSION_PRESETS[2];

		const firstP = newPeriods[0];
		const secondP = newPeriods[1];

		const newVkProtocol: MedicalCommissionProtocol | undefined = isVk
			? {
					protocolNumber: 'ВК-84/2026',
					protocolDate: firstP ? firstP.dateTo : formState.issueDate,
					chairpersonFio: chairPreset ? chairPreset.fio : 'Иванова Е.В.',
					chairpersonSpecialty: chairPreset ? chairPreset.specialty : 'Главный врач',
					chairpersonSnils: chairPreset ? chairPreset.snils : '142-876-543 89',
					deputyChairpersonFio: deputyPreset ? deputyPreset.fio : 'Смирнов П.А.',
					memberFios: [memberPreset ? memberPreset.fio : 'Кузнецова О.Д.', initialDoctorFio],
					attendingDoctorFio: initialDoctorFio,
					clinicalDiagnosis: preset.clinicalDescriptionRu,
					icd10Code: preset.icd10Code,
					clinicalSubstantiation: preset.expertJustificationRu,
					expertDecision: `Продлить листок нетрудоспособности № ${formState.elnNumber} с ${formatDateRu(secondP ? secondP.dateFrom : '')} по ${formatDateRu(secondP ? secondP.dateTo : '')}. Режим амбулаторный. Назначен повторный осмотр ВК.`,
					extensionDays: preset.defaultDays - 15,
					extensionDateFrom: secondP ? secondP.dateFrom : '',
					extensionDateTo: secondP ? secondP.dateTo : '',
					nextReviewDate: secondP ? secondP.dateTo : ''
				}
			: undefined;

		setFormState((prev) => ({
			...prev,
			reasonCode: preset.reasonCode,
			icd10Code: preset.icd10Code,
			diagnosisText: preset.clinicalDescriptionRu,
			periods: newPeriods,
			isVkRequired: isVk,
			vkProtocol: newVkProtocol,
			workResumeDate: initDates.workResumeDate
		}));
	};

	// Validation
	const validation = useMemo(() => {
		return validateSickLeaveDuration(formState);
	}, [formState]);

	// Period Operations
	const handleAddPeriod = () => {
		const lastPeriod = formState.periods[formState.periods.length - 1];
		const nextStart = lastPeriod ? addDays(lastPeriod.dateTo, 1) : formState.issueDate;
		const nextDates = calculateSickLeaveDates(nextStart, 5);
		const chair = DEFAULT_COMMISSION_PRESETS[0];

		const newPeriod: IncapacityPeriod = {
			id: `p-${Date.now()}`,
			dateFrom: nextDates.dateFrom,
			dateTo: nextDates.dateTo,
			doctorSpecialty: initialDoctorSpecialty,
			doctorFio: initialDoctorFio,
			doctorSnils: initialDoctorSnils,
			doctorRole: formState.isVkRequired ? 'vk_member' : 'attending',
			vkChairpersonFio: formState.isVkRequired && chair ? chair.fio : undefined,
			vkChairpersonSnils: formState.isVkRequired && chair ? chair.snils : undefined,
			vkProtocolNumber: formState.isVkRequired ? formState.vkProtocol?.protocolNumber || 'ВК-84/2026' : undefined,
			vkProtocolDate: formState.isVkRequired ? nextStart : undefined
		};

		setFormState((prev) => {
			const updated = [...prev.periods, newPeriod];
			return {
				...prev,
				periods: updated,
				workResumeDate: nextDates.workResumeDate
			};
		});
	};

	const handleRemovePeriod = (index: number) => {
		if (formState.periods.length <= 1) return;
		setFormState((prev) => {
			const updated = prev.periods.filter((_, idx) => idx !== index);
			const last = updated[updated.length - 1];
			return {
				...prev,
				periods: updated,
				workResumeDate: last ? addDays(last.dateTo, 1) : prev.workResumeDate
			};
		});
	};

	const handlePeriodDateChange = (index: number, field: 'dateFrom' | 'dateTo', value: string) => {
		setFormState((prev) => {
			const existing = prev.periods[index];
			if (!existing) return prev;
			const updated = [...prev.periods];
			const current: IncapacityPeriod = { ...existing, [field]: value };
			updated[index] = current;
			const last = updated[updated.length - 1];
			return {
				...prev,
				periods: updated,
				workResumeDate: last && last.dateTo ? addDays(last.dateTo, 1) : prev.workResumeDate
			};
		});
	};

	// Toggle Medical Commission
	const handleToggleVk = (enable: boolean) => {
		if (enable) {
			const lastPeriod = formState.periods[formState.periods.length - 1];
			const chair = DEFAULT_COMMISSION_PRESETS[0];
			const deputy = DEFAULT_COMMISSION_PRESETS[1];
			const member = DEFAULT_COMMISSION_PRESETS[2];

			const vkProtocol: MedicalCommissionProtocol = {
				protocolNumber: formState.vkProtocol?.protocolNumber || 'ВК-84/2026',
				protocolDate: lastPeriod?.dateFrom || formState.issueDate,
				chairpersonFio: chair ? chair.fio : 'Иванова Е.В.',
				chairpersonSpecialty: chair ? chair.specialty : 'Главный врач',
				chairpersonSnils: chair ? chair.snils : '142-876-543 89',
				deputyChairpersonFio: deputy ? deputy.fio : 'Смирнов П.А.',
				memberFios: [member ? member.fio : 'Кузнецова О.Д.', initialDoctorFio],
				attendingDoctorFio: initialDoctorFio,
				clinicalDiagnosis: formState.diagnosisText,
				icd10Code: formState.icd10Code,
				clinicalSubstantiation:
					'Тяжелое клиническое течение одонтогенного процесса с интоксикацией и замедленной регенерацией костной ткани. Необходимость продления нетрудоспособности свыше 15 дней (Приказ № 1089н).',
				expertDecision: `Продлить временную нетрудоспособность по ЭЛН № ${formState.elnNumber}. Режим амбулаторный. Назначен контрольный осмотр.`,
				extensionDays: 7,
				extensionDateFrom: lastPeriod?.dateFrom || formState.issueDate,
				extensionDateTo: lastPeriod?.dateTo || formState.issueDate,
				nextReviewDate: lastPeriod?.dateTo || formState.issueDate
			};
			setFormState((prev) => ({
				...prev,
				isVkRequired: true,
				vkProtocol
			}));
		} else {
			setFormState((prev) => ({
				...prev,
				isVkRequired: false,
				vkProtocol: undefined
			}));
		}
	};

	// Handlers
	const handleCopyDiarySnippet = () => {
		const snippet = generateEmrDiarySnippet(formState, patientData);
		navigator.clipboard.writeText(snippet);
		setIsCopiedDiary(true);
		setTimeout(() => setIsCopiedDiary(false), 2000);
	};

	const handleApplyDiary = () => {
		const snippet = generateEmrDiarySnippet(formState, patientData);
		if (onApplyToDiary) {
			onApplyToDiary(snippet, formState);
		}
		onClose();
	};

	const handleSendSfr = () => {
		setIsSfrSent(true);
		setTimeout(() => setIsSfrSent(false), 4000);
	};

	const handlePrintMemo = () => {
		const html = generateSickLeavePatientMemoHtml(formState, patientData);
		const printWin = window.open('', '_blank');
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 300);
		}
	};

	const xmlPayload = useMemo(() => {
		return generateElnXmlPayload(formState, patientData);
	}, [formState, patientData]);

	const jsonPayload = useMemo(() => {
		return JSON.stringify(generateElnJsonPayload(formState, patientData), null, 2);
	}, [formState, patientData]);

	const form036u = useMemo(() => {
		return generateForm036uEntry(formState, patientData);
	}, [formState, patientData]);

	if (!isOpen) return null;

	return (
		<div className="sick-leave-modal-overlay" role="dialog" aria-modal="true">
			<div className="sick-leave-modal-container">
				{/* Modal Header */}
				<div className="sick-leave-header">
					<div className="sick-leave-header-title-group">
						<div className="sick-leave-title-icon">
							<Stethoscope size={20} />
						</div>
						<div>
							<h3 className="sick-leave-header-title">Электронный листок нетрудоспособности (ЭЛН)</h3>
							<div className="sick-leave-header-badges">
								<span className="sick-leave-eln-number-badge">№ {formState.elnNumber}</span>
								<span className={`sick-leave-limit-badge ${validation.singleDoctorLimitExceeded ? 'vk-required' : 'safe'}`}>
									{validation.singleDoctorLimitExceeded ? (
										<>
											<AlertTriangle size={12} />
											{validation.totalDays} дн. (Лимит &gt;15 дн. — требуется ВК)
										</>
									) : (
										<>
											<ShieldCheck size={12} />
											{validation.totalDays} дн. (Единолично врачом &le;15 дн.)
										</>
									)}
								</span>
							</div>
						</div>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<button
							type="button"
							className="sick-leave-close-btn"
							onClick={onClose}
							title="Закрыть окно"
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Quick Presets Bar */}
				<div className="sick-leave-presets-bar">
					<span className="sick-leave-presets-label">
						<Sparkles size={13} />
						Шаблоны 1089н:
					</span>
					{Object.entries(DENTAL_CLINICAL_PRESETS).map(([key, preset]) => (
						<button
							key={key}
							type="button"
							className={`sick-leave-preset-chip ${selectedPresetId === key ? 'active' : ''}`}
							onClick={() => handleApplyPreset(key)}
						>
							{preset.shortTitleRu} ({preset.defaultDays} дн.)
						</button>
					))}
				</div>

				{/* Tabs Navigation */}
				<div className="sick-leave-tabs-bar">
					<button
						type="button"
						className={`sick-leave-tab-btn ${activeTab === 'eln_form' ? 'active' : ''}`}
						onClick={() => setActiveTab('eln_form')}
					>
						<FileText size={16} />
						1. Оформление ЭЛН
					</button>
					<button
						type="button"
						className={`sick-leave-tab-btn ${activeTab === 'vk_protocol' ? 'active' : ''}`}
						onClick={() => setActiveTab('vk_protocol')}
					>
						<UserCheck size={16} />
						2. Протокол ВК ({formState.isVkRequired ? 'Активен' : 'Выкл'})
					</button>
					<button
						type="button"
						className={`sick-leave-tab-btn ${activeTab === 'journal_036' ? 'active' : ''}`}
						onClick={() => setActiveTab('journal_036')}
					>
						<Building2 size={16} />
						3. Журнал 036/у
					</button>
					<button
						type="button"
						className={`sick-leave-tab-btn ${activeTab === 'patient_memo' ? 'active' : ''}`}
						onClick={() => setActiveTab('patient_memo')}
					>
						<Printer size={16} />
						4. Памятка пациенту (А5)
					</button>
					<button
						type="button"
						className={`sick-leave-tab-btn ${activeTab === 'xml_sfr' ? 'active' : ''}`}
						onClick={() => setActiveTab('xml_sfr')}
					>
						<Send size={16} />
						5. СФР / ЕГИСЗ XML
					</button>
				</div>

				{/* Tab 1: ELN Main Form */}
				{activeTab === 'eln_form' && (
					<div className="sick-leave-body">
						{/* Validation Alerts */}
						{validation.errors.length > 0 && (
							<div className="sick-leave-alert error">
								<AlertTriangle size={18} style={{ flexShrink: 0 }} />
								<div>
									<strong>Требуется исправление перед передачей в СФР:</strong>
									<ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
										{validation.errors.map((err, i) => (
											<li key={i}>{err}</li>
										))}
									</ul>
								</div>
							</div>
						)}

						{validation.warnings.length > 0 && (
							<div className="sick-leave-alert warning">
								<AlertTriangle size={18} style={{ flexShrink: 0 }} />
								<div>
									<strong>Предупреждения эксперта:</strong>
									<ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
										{validation.warnings.map((w, i) => (
											<li key={i}>{w}</li>
										))}
									</ul>
								</div>
							</div>
						)}

						{/* Patient Requisites */}
						<div className="sick-leave-section">
							<h4 className="sick-leave-section-title">
								<UserCheck size={16} />
								Реквизиты пациента и работодателя
							</h4>
							<div className="sick-leave-grid-3">
								<div className="sick-leave-field">
									<label className="sick-leave-label">ФИО Пациента</label>
									<input
										type="text"
										className="sick-leave-input"
										value={patientData.patientFio}
										onChange={(e) => setPatientData({ ...patientData, patientFio: e.target.value })}
									/>
								</div>
								<div className="sick-leave-field">
									<label className="sick-leave-label">СНИЛС (11 цифр)</label>
									<input
										type="text"
										className="sick-leave-input"
										value={patientData.patientSnils}
										onChange={(e) => setPatientData({ ...patientData, patientSnils: e.target.value })}
									/>
								</div>
								<div className="sick-leave-field">
									<label className="sick-leave-label">Дата рождения</label>
									<input
										type="date"
										className="sick-leave-input"
										value={patientData.patientBirthDate}
										onChange={(e) => setPatientData({ ...patientData, patientBirthDate: e.target.value })}
									/>
								</div>
							</div>

							<div className="sick-leave-grid-2">
								<div className="sick-leave-field">
									<label className="sick-leave-label">Место работы (Наименование организации)</label>
									<input
										type="text"
										className="sick-leave-input"
										value={patientData.employerName}
										onChange={(e) => setPatientData({ ...patientData, employerName: e.target.value })}
									/>
								</div>
								<div className="sick-leave-field">
									<label className="sick-leave-label">Вид занятости</label>
									<select
										className="sick-leave-select"
										value={patientData.isPrimaryWorkplace ? 'primary' : 'secondary'}
										onChange={(e) =>
											setPatientData({ ...patientData, isPrimaryWorkplace: e.target.value === 'primary' })
										}
									>
										<option value="primary">Основное место работы</option>
										<option value="secondary">По совместительству</option>
									</select>
								</div>
							</div>
						</div>

						{/* Clinical Diagnosis & Order 1089n Parameters */}
						<div className="sick-leave-section">
							<h4 className="sick-leave-section-title">
								<Stethoscope size={16} />
								Клинические параметры временной нетрудоспособности
							</h4>
							<div className="sick-leave-grid-3">
								<div className="sick-leave-field">
									<label className="sick-leave-label">Причина нетрудоспособности (СФР)</label>
									<select
										className="sick-leave-select"
										value={formState.reasonCode}
										onChange={(e) =>
											setFormState({ ...formState, reasonCode: e.target.value as IncapacityReasonCode })
										}
									>
										{Object.values(INCAPACITY_REASON_CODES).map((r) => (
											<option key={r.code} value={r.code}>
												{r.titleRu}
											</option>
										))}
									</select>
								</div>

								<div className="sick-leave-field">
									<label className="sick-leave-label">Режим лечения</label>
									<select
										className="sick-leave-select"
										value={formState.regimeType}
										onChange={(e) =>
											setFormState({ ...formState, regimeType: e.target.value as IncapacityRegimeType })
										}
									>
										<option value="ambulatory">01 - Амбулаторный</option>
										<option value="hospital">02 - Стационарный</option>
										<option value="day_hospital">03 - Дневной стационар</option>
										<option value="sanatorium">04 - Санаторно-курортный</option>
									</select>
								</div>

								<div className="sick-leave-field">
									<label className="sick-leave-label">Код диагноза МКБ-10</label>
									<input
										type="text"
										className="sick-leave-input"
										value={formState.icd10Code}
										onChange={(e) => setFormState({ ...formState, icd10Code: e.target.value })}
									/>
								</div>
							</div>

							<div className="sick-leave-field">
								<label className="sick-leave-label">Клиническое описание диагноза</label>
								<textarea
									className="sick-leave-textarea"
									value={formState.diagnosisText}
									onChange={(e) => setFormState({ ...formState, diagnosisText: e.target.value })}
									rows={2}
								/>
							</div>
						</div>

						{/* Incapacity Periods Table */}
						<div className="sick-leave-section">
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<h4 className="sick-leave-section-title">
									<Calendar size={16} />
									Периоды освобождения от работы (Суммарно: {validation.totalDays} дн.)
								</h4>
								<button type="button" className="sick-leave-add-period-btn" onClick={handleAddPeriod}>
									<Plus size={14} />
									Добавить период продления
								</button>
							</div>

							<div className="sick-leave-periods-list">
								{formState.periods.map((period, index) => {
									const pDays = calculateDaysBetween(period.dateFrom, period.dateTo);
									return (
										<div key={period.id} className="sick-leave-period-card">
											<div className="sick-leave-period-header">
												<span>
													Период №{index + 1}: с {formatDateRu(period.dateFrom)} по {formatDateRu(period.dateTo)}{' '}
													({pDays} кал. дн.)
												</span>
												{formState.periods.length > 1 && (
													<button
														type="button"
														onClick={() => handleRemovePeriod(index)}
														className="sick-leave-delete-period-btn"
														title="Удалить период"
														aria-label="Удалить период"
													>
														<Trash2 size={18} />
													</button>
												)}
											</div>

											<div className="sick-leave-grid-4">
												<div className="sick-leave-field">
													<label className="sick-leave-label">Дата с</label>
													<input
														type="date"
														className="sick-leave-input"
														value={period.dateFrom}
														onChange={(e) => handlePeriodDateChange(index, 'dateFrom', e.target.value)}
													/>
												</div>
												<div className="sick-leave-field">
													<label className="sick-leave-label">Дата по</label>
													<input
														type="date"
														className="sick-leave-input"
														value={period.dateTo}
														onChange={(e) => handlePeriodDateChange(index, 'dateTo', e.target.value)}
													/>
												</div>
												<div className="sick-leave-field">
													<label className="sick-leave-label">Врач</label>
													<input
														type="text"
														className="sick-leave-input"
														value={period.doctorFio}
														onChange={(e) => {
															const existing = formState.periods[index];
															if (!existing) return;
															const updated = [...formState.periods];
															const item: IncapacityPeriod = { ...existing, doctorFio: e.target.value };
															updated[index] = item;
															setFormState({ ...formState, periods: updated });
														}}
													/>
												</div>
												<div className="sick-leave-field">
													<label className="sick-leave-label">Полномочие</label>
													<select
														className="sick-leave-select"
														value={period.doctorRole}
														onChange={(e) => {
															const existing = formState.periods[index];
															if (!existing) return;
															const updated = [...formState.periods];
															const item: IncapacityPeriod = {
																...existing,
																doctorRole: e.target.value as 'attending' | 'vk_member' | 'vk_chairperson'
															};
															updated[index] = item;
															setFormState({ ...formState, periods: updated });
														}}
													>
														<option value="attending">Лечащий врач</option>
														<option value="vk_member">Член ВК + Председатель</option>
													</select>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Closing Status & Violations */}
						<div className="sick-leave-section">
							<h4 className="sick-leave-section-title">
								<CheckCircle2 size={16} />
								Закрытие ЭЛН и выход на работу
							</h4>
							<div className="sick-leave-grid-3">
								<div className="sick-leave-field">
									<label className="sick-leave-label">Итоговый статус</label>
									<select
										className="sick-leave-select"
										value={formState.closingCode}
										onChange={(e) =>
											setFormState({ ...formState, closingCode: e.target.value as SickLeaveClosingCode })
										}
									>
										{Object.values(SICK_LEAVE_CLOSING_CODES).map((c) => (
											<option key={c.code} value={c.code}>
												{c.titleRu}
											</option>
										))}
									</select>
								</div>

								{formState.closingCode === '31' && (
									<div className="sick-leave-field">
										<label className="sick-leave-label">Приступить к работе с</label>
										<input
											type="date"
											className="sick-leave-input"
											value={formState.workResumeDate || ''}
											onChange={(e) => setFormState({ ...formState, workResumeDate: e.target.value })}
										/>
									</div>
								)}

								{formState.closingCode === '32' && (
									<div className="sick-leave-field">
										<label className="sick-leave-label">Номер нового ЭЛН (продолжения)</label>
										<input
											type="text"
											className="sick-leave-input"
											value={formState.nextElnNumber || ''}
											placeholder="999..."
											onChange={(e) => setFormState({ ...formState, nextElnNumber: e.target.value })}
										/>
									</div>
								)}

								<div className="sick-leave-field">
									<label className="sick-leave-label">Отметка о нарушении режима</label>
									<select
										className="sick-leave-select"
										value={formState.violationCode || ''}
										onChange={(e) =>
											setFormState({
												...formState,
												violationCode: (e.target.value || undefined) as RegimeViolationCode | undefined
											})
										}
									>
										<option value="">Без нарушений</option>
										{Object.values(REGIME_VIOLATION_CODES).map((v) => (
											<option key={v.code} value={v.code}>
												{v.titleRu}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Tab 2: Medical Commission (ВК) Protocol */}
				{activeTab === 'vk_protocol' && (
					<div className="sick-leave-body">
						<div className="sick-leave-section">
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<div>
									<h4 className="sick-leave-section-title">
										<UserCheck size={16} />
										Заседание Врачебной комиссии (ВК) по Приказу Минздрава РФ № 1089н
									</h4>
									<p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
										Обязательно при суммарной нетрудоспособности свыше 15 календарных дней (п. 19 Приказа № 1089н).
									</p>
								</div>
								<button
									type="button"
									className={`sick-leave-btn ${formState.isVkRequired ? 'primary' : 'secondary'}`}
									onClick={() => handleToggleVk(!formState.isVkRequired)}
								>
									{formState.isVkRequired ? 'ВК Активирована' : 'Сформировать протокол ВК'}
								</button>
							</div>

							{formState.isVkRequired && formState.vkProtocol && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '0.5rem' }}>
									<div className="sick-leave-grid-3">
										<div className="sick-leave-field">
											<label className="sick-leave-label">Номер протокола ВК</label>
											<input
												type="text"
												className="sick-leave-input"
												value={formState.vkProtocol.protocolNumber}
												onChange={(e) =>
													setFormState({
														...formState,
														vkProtocol: { ...formState.vkProtocol!, protocolNumber: e.target.value }
													})
												}
											/>
										</div>
										<div className="sick-leave-field">
											<label className="sick-leave-label">Дата заседания ВК</label>
											<input
												type="date"
												className="sick-leave-input"
												value={formState.vkProtocol.protocolDate}
												onChange={(e) =>
													setFormState({
														...formState,
														vkProtocol: { ...formState.vkProtocol!, protocolDate: e.target.value }
													})
												}
											/>
										</div>
										<div className="sick-leave-field">
											<label className="sick-leave-label">Председатель ВК (Главврач)</label>
											<input
												type="text"
												className="sick-leave-input"
												value={formState.vkProtocol.chairpersonFio}
												onChange={(e) =>
													setFormState({
														...formState,
														vkProtocol: { ...formState.vkProtocol!, chairpersonFio: e.target.value }
													})
												}
											/>
										</div>
									</div>

									<div className="sick-leave-grid-2">
										<div className="sick-leave-field">
											<label className="sick-leave-label">СНИЛС Председателя ВК</label>
											<input
												type="text"
												className="sick-leave-input"
												value={formState.vkProtocol.chairpersonSnils}
												onChange={(e) =>
													setFormState({
														...formState,
														vkProtocol: { ...formState.vkProtocol!, chairpersonSnils: e.target.value }
													})
												}
											/>
										</div>
										<div className="sick-leave-field">
											<label className="sick-leave-label">Члены комиссии</label>
											<input
												type="text"
												className="sick-leave-input"
												value={formState.vkProtocol.memberFios.join(', ')}
												onChange={(e) =>
													setFormState({
														...formState,
														vkProtocol: {
															...formState.vkProtocol!,
															memberFios: e.target.value.split(',').map((s) => s.trim())
														}
													})
												}
											/>
										</div>
									</div>

									<div className="sick-leave-field">
										<label className="sick-leave-label">Клинико-экспертное обоснование продления</label>
										<textarea
											className="sick-leave-textarea"
											rows={3}
											value={formState.vkProtocol.clinicalSubstantiation}
											onChange={(e) =>
												setFormState({
													...formState,
													vkProtocol: { ...formState.vkProtocol!, clinicalSubstantiation: e.target.value }
												})
											}
										/>
									</div>

									<div className="sick-leave-field">
										<label className="sick-leave-label">Решение Врачебной комиссии</label>
										<textarea
											className="sick-leave-textarea"
											rows={2}
											value={formState.vkProtocol.expertDecision}
											onChange={(e) =>
												setFormState({
													...formState,
													vkProtocol: { ...formState.vkProtocol!, expertDecision: e.target.value }
												})
											}
										/>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Tab 3: Form 036/u Journal */}
				{activeTab === 'journal_036' && (
					<div className="sick-leave-body">
						<div className="sick-leave-section">
							<h4 className="sick-leave-section-title">
								<Building2 size={16} />
								Журнал учета клинико-экспертной работы (Учетная форма № 036/у)
							</h4>
							<table className="sick-leave-journal-table">
								<thead>
									<tr>
										<th>№ / Дата</th>
										<th>Пациент / СНИЛС</th>
										<th>Диагноз МКБ-10</th>
										<th>Номер ЭЛН / Срок</th>
										<th>Обоснование и решение комиссии</th>
										<th>Подписи экспертов</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td>
											<strong>№ {form036u.entryNumber}</strong>
											<br />
											{form036u.date}
										</td>
										<td>
											<strong>{form036u.patientFio}</strong>
											<br />
											{form036u.birthDate} | СНИЛС: {form036u.snils}
											<br />
											Карта: {form036u.medicalCardNumber}
										</td>
										<td>
											<strong>{form036u.icd10}</strong>
											<br />
											{form036u.diagnosis}
										</td>
										<td>
											<strong>ЭЛН № {form036u.sickLeaveNumber}</strong>
											<br />
											{form036u.incapacityPeriodText}
										</td>
										<td>
											<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>{form036u.vkReason}</div>
											<div style={{ marginTop: '4px', fontWeight: 600 }}>{form036u.vkDecisionText}</div>
										</td>
										<td>
											<div>
												Председатель: <strong>{form036u.chairpersonSign}</strong>
											</div>
											{form036u.membersSign.length > 0 && (
												<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginTop: '2px' }}>
													Члены ВК: {form036u.membersSign.join(', ')}
												</div>
											)}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Tab 4: Patient Memo Preview */}
				{activeTab === 'patient_memo' && (
					<div className="sick-leave-body">
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<h4 className="sick-leave-section-title">
								<Printer size={16} />
								Печатный талон-памятка пациенту (Формат А5)
							</h4>
							<button type="button" className="sick-leave-btn primary" onClick={handlePrintMemo}>
								<Printer size={16} />
								Распечатать памятку (А5/А4)
							</button>
						</div>
						<div
							className="sick-leave-memo-preview-wrap"
							dangerouslySetInnerHTML={{
								__html: generateSickLeavePatientMemoHtml(formState, patientData)
							}}
						/>
					</div>
				)}

				{/* Tab 5: XML / JSON for SFR */}
				{activeTab === 'xml_sfr' && (
					<div className="sick-leave-body">
						<div className="sick-leave-code-container">
							<div className="sick-leave-code-header">
								<span>XML СЭМД ЭЛН v2.0 (Социальный фонд России / Приказ 1089н)</span>
								<button
									type="button"
									className="sick-leave-btn secondary"
									style={{ padding: '0.5rem 0.875rem', minHeight: '44px' }}
									onClick={() => {
										navigator.clipboard.writeText(xmlPayload);
										setIsCopiedXml(true);
										setTimeout(() => setIsCopiedXml(false), 2000);
									}}
								>
									{isCopiedXml ? <Check size={14} /> : <Copy size={14} />}
									{isCopiedXml ? 'Скопировано' : 'Копировать XML'}
								</button>
							</div>
							<pre className="sick-leave-code-box">{xmlPayload}</pre>
						</div>

						<div className="sick-leave-code-container">
							<div className="sick-leave-code-header">
								<span>JSON API Payload (ЕГИСЗ РЭМД Gateway)</span>
							</div>
							<pre className="sick-leave-code-box">{jsonPayload}</pre>
						</div>
					</div>
				)}

				{/* Footer Actions */}
				<div className="sick-leave-footer">
					<div className="sick-leave-footer-left">
						<span>
							Всего дней: <strong>{validation.totalDays}</strong> | Лимит врача:{' '}
							<strong>{SINGLE_DOCTOR_MAX_DAYS} дн.</strong>
						</span>
					</div>

					<div className="sick-leave-footer-right">
						<button type="button" className="sick-leave-btn secondary" onClick={handleCopyDiarySnippet}>
							{isCopiedDiary ? <Check size={16} /> : <Copy size={16} />}
							{isCopiedDiary ? 'Скопировано в буфер' : 'Копировать в карту 043/у'}
						</button>

						<button
							type="button"
							className={`sick-leave-btn ${isSfrSent ? 'success' : 'primary'} ${!validation.isValid ? 'disabled' : ''}`}
							onClick={handleSendSfr}
							disabled={!validation.isValid}
						>
							{isSfrSent ? <CheckCircle2 size={16} /> : <Send size={16} />}
							{isSfrSent ? 'Успешно отправлено в СФР' : 'Отправить в СФР (ЭЛН)'}
						</button>

						{onApplyToDiary && (
							<button
								type="button"
								className="sick-leave-btn primary"
								onClick={handleApplyDiary}
								disabled={!validation.isValid}
							>
								<Check size={16} />
								Вставить в дневник приема
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
