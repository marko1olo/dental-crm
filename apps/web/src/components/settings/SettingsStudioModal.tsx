/**
 * apps/web/src/components/settings/SettingsStudioModal.tsx
 * DENTE Dental CRM — Каноническая студия настроек клиники и реквизитов (SSOT).
 * Архитектура Sweet Spot (Мандаты 8b 400–480 строк, 8e, 8n, 8am, 8ze).
 * Ровно ОДНА Primary CTA кнопка #0d9488, кнопки НИКОГДА не disabled, 0px горизонтального скролла.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	Building, Clock, Users, Wrench, X, Check,
	ShieldCheck, Sparkles, Plus, Trash2, Smartphone, Landmark,
} from "lucide-react";
import {
	loadClinicStudioSettings, saveClinicStudioSettings,
	STANDARD_CLINIC_PRESET_RF, SOLO_DOCTOR_PRESET_RF, ENTERPRISE_CLINIC_PRESET_RF,
	ROLE_LABELS, SPECIALTY_LABELS, formatInnHint, validateRequisitesSoft,
	type ClinicStudioSettings, type ClinicChair, type ClinicStaffMember,
} from "./settingsCatalogData";
import { showToast } from "../GlobalToast";
import "./settingsStudio.css";

export interface SettingsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: "requisites" | "schedule" | "staff" | "integrations";
	readonly onSave?: (settings: ClinicStudioSettings) => void;
}

export const SettingsStudioModal: React.FC<SettingsStudioModalProps> = ({
	isOpen, onClose, initialTab = "requisites", onSave,
}) => {
	const [activeTab, setActiveTab] = useState<"requisites" | "schedule" | "staff" | "integrations">(initialTab);
	const [settings, setSettings] = useState<ClinicStudioSettings>(() => loadClinicStudioSettings());
	const [saveFeedback, setSaveFeedback] = useState<string>("Все изменения сохранены");
	const [newStaffName, setNewStaffName] = useState<string>("");
	const [newStaffRole, setNewStaffRole] = useState<"doctor" | "administrator" | "assistant" | "manager">("doctor");

	useEffect(() => {
		if (isOpen) {
			setSettings(loadClinicStudioSettings());
			setSaveFeedback("Все изменения сохранены");
		}
	}, [isOpen]);

	useEffect(() => {
		const timer = setTimeout(() => {
			saveClinicStudioSettings(settings);
			setSaveFeedback("Автосохранение выполнено");
		}, 600);
		return () => clearTimeout(timer);
	}, [settings]);

	const updateRequisites = useCallback((field: string, val: string) => {
		setSettings((prev) => ({ ...prev, requisites: { ...prev.requisites, [field]: val } }));
	}, []);

	const updateSchedule = useCallback((field: string, val: any) => {
		setSettings((prev) => ({ ...prev, schedule: { ...prev.schedule, [field]: val } }));
	}, []);

	const toggleWorkingDay = useCallback((day: number) => {
		setSettings((prev) => {
			const cur = prev.schedule.workingDays;
			const nextDays = cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].sort();
			return { ...prev, schedule: { ...prev.schedule, workingDays: nextDays } };
		});
	}, []);

	const toggleChairEquipment = useCallback((chairId: string, prop: "hasXraySensor" | "hasMicroscope" | "hasSurgeryKit") => {
		setSettings((prev) => ({
			...prev,
			chairs: prev.chairs.map((c) => (c.id === chairId ? { ...c, [prop]: !c[prop] } : c)),
		}));
	}, []);

	const handleAddChair = useCallback(() => {
		setSettings((prev) => {
			if (prev.chairs.length >= 5) {
				showToast("Максимально доступно 5 кресел в клинике", "info");
				return prev;
			}
			const nextNum = prev.chairs.length + 1;
			const newChair: ClinicChair = {
				id: `chair-${Date.now()}`, name: `Кресло ${nextNum}`,
				color: nextNum === 4 ? "#f59e0b" : "#ec4899",
				hasXraySensor: true, hasMicroscope: false, hasSurgeryKit: false, isActive: true,
			};
			return { ...prev, chairs: [...prev.chairs, newChair] };
		});
		showToast("Новое кресло добавлено в расписание", "success");
	}, []);

	const handleDeleteChair = useCallback((id: string) => {
		setSettings((prev) => {
			if (prev.chairs.length <= 1) {
				showToast("В клинике должно быть хотя бы одно рабочее кресло", "warning");
				return prev;
			}
			return { ...prev, chairs: prev.chairs.filter((c) => c.id !== id) };
		});
	}, []);

	const handleAddStaff = useCallback(() => {
		if (!newStaffName.trim()) {
			showToast("Введите ФИО сотрудника", "info");
			return;
		}
		const newMember: ClinicStaffMember = {
			id: `staff-${Date.now()}`, fullName: newStaffName.trim(), role: newStaffRole,
			specialty: "universal", phone: "+7 (999) 000-00-00", email: "doctor@dente-clinic.ru", isActive: true,
		};
		setSettings((prev) => ({ ...prev, staff: [...prev.staff, newMember] }));
		setNewStaffName("");
		showToast(`Сотрудник ${newMember.fullName} добавлен`, "success");
	}, [newStaffName, newStaffRole]);

	const handleDeleteStaff = useCallback((id: string) => {
		setSettings((prev) => ({ ...prev, staff: prev.staff.filter((s) => s.id !== id) }));
	}, []);

	const applyStandardPreset = useCallback(() => {
		setSettings({ ...STANDARD_CLINIC_PRESET_RF });
		saveClinicStudioSettings(STANDARD_CLINIC_PRESET_RF);
		setSaveFeedback("Стандартные настройки РФ применены");
		showToast("✓ Заполнены стандартные настройки клиники РФ", "success");
	}, []);

	const applySoloPreset = useCallback(() => {
		setSettings({ ...SOLO_DOCTOR_PRESET_RF });
		saveClinicStudioSettings(SOLO_DOCTOR_PRESET_RF);
		setSaveFeedback("Пресет соло-врача применен");
		showToast("✓ Применен профиль соло-врача (ИП)", "success");
	}, []);

	const applyEnterprisePreset = useCallback(() => {
		setSettings({ ...ENTERPRISE_CLINIC_PRESET_RF });
		saveClinicStudioSettings(ENTERPRISE_CLINIC_PRESET_RF);
		setSaveFeedback("Пресет медцентра применен");
		showToast("✓ Применен профиль стоматологического центра", "success");
	}, []);

	const handleExplicitSave = useCallback(() => {
		saveClinicStudioSettings(settings);
		setSaveFeedback("Настройки успешно сохранены");
		onSave?.(settings);
		showToast("✓ Настройки клиники сохранены", "success");
		onClose();
	}, [settings, onSave, onClose]);

	if (!isOpen) return null;

	return (
		<div className="settings-studio-backdrop" data-testid="settings-studio-modal-root" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="settings-studio-card" role="dialog" aria-modal="true" aria-label="Студия настроек клиники">
				<div className="settings-studio-drag-handle" aria-hidden="true" />

				<header className="settings-studio-header">
					<div className="settings-studio-header-title">
						<div className="settings-studio-header-icon" aria-hidden="true"><Building size={20} /></div>
						<div className="settings-studio-header-text">
							<div className="flex items-center gap-2">
								<h2>Настройки клиники и реквизиты</h2>
								<span className="settings-studio-scale-pill">
									{settings.chairs.length === 1 ? "1 кресло · Соло" : settings.chairs.length <= 3 ? `${settings.chairs.length} кресла · Клиника` : `${settings.chairs.length} кресел · Сеть`}
								</span>
							</div>
							<p>Юридический профиль, кресла, врачи и фискализация DENTE</p>
						</div>
					</div>
					<div className="settings-studio-header-actions">
						<button type="button" className="settings-studio-preset-btn" data-testid="btn-preset-solo-ip" onClick={applySoloPreset} title="Заполнить настройки соло-врача (ИП/аренда кресла)">
							<span>Соло-врач (ИП)</span>
						</button>
						<button type="button" className="settings-studio-preset-btn" data-testid="btn-preset-standard-rf" onClick={applyStandardPreset} title="Заполнить стандартные реквизиты ООО для стоматологии РФ">
							<Sparkles size={14} className="text-[var(--settings-teal)]" aria-hidden="true" />
							<span>✓ Клиника РФ (3 кресла)</span>
						</button>
						<button type="button" className="settings-studio-preset-btn" data-testid="btn-preset-enterprise-rf" onClick={applyEnterprisePreset} title="Заполнить профиль стоматологического центра (5 кресел)">
							<span>Сеть / Центр</span>
						</button>
						<button type="button" className="settings-studio-close-btn" onClick={onClose} aria-label="Закрыть настройки"><X size={18} aria-hidden="true" /></button>
					</div>
				</header>

				<nav className="settings-studio-tabs" aria-label="Разделы настроек клиники">
					<button type="button" className={`settings-studio-tab-btn ${activeTab === "requisites" ? "active" : ""}`} data-testid="tab-settings-requisites" onClick={() => setActiveTab("requisites")}>
						<Building size={16} aria-hidden="true" /><span>Реквизиты и адрес</span>
					</button>
					<button type="button" className={`settings-studio-tab-btn ${activeTab === "schedule" ? "active" : ""}`} data-testid="tab-settings-schedule" onClick={() => setActiveTab("schedule")}>
						<Clock size={16} aria-hidden="true" /><span>Режим работы и кресла</span>
					</button>
					<button type="button" className={`settings-studio-tab-btn ${activeTab === "staff" ? "active" : ""}`} data-testid="tab-settings-staff" onClick={() => setActiveTab("staff")}>
						<Users size={16} aria-hidden="true" /><span>Врачи и персонал ({settings.staff.length})</span>
					</button>
					<button type="button" className={`settings-studio-tab-btn ${activeTab === "integrations" ? "active" : ""}`} data-testid="tab-settings-integrations" onClick={() => setActiveTab("integrations")}>
						<Wrench size={16} aria-hidden="true" /><span>Интеграции и касса</span>
					</button>
				</nav>

				<main className="settings-studio-body">
					{activeTab === "requisites" && (
						<section className="settings-studio-section" aria-label="Реквизиты юридического лица">
							<div className="settings-studio-grid-2">
								<div className="settings-studio-field">
									<label htmlFor="input-clinic-name">Название клиники (для пациентов и вывески)</label>
									<input id="input-clinic-name" data-testid="input-clinic-name" type="text" value={settings.requisites.clinicName} onChange={(e) => updateRequisites("clinicName", e.target.value)} placeholder="Например: Стоматология ДЕНТЕ" />
								</div>
								<div className="settings-studio-field">
									<label htmlFor="input-legal-name">Юридическое лицо или ИП (для договоров и чеков)</label>
									<input id="input-legal-name" data-testid="input-legal-name" type="text" value={settings.requisites.legalName} onChange={(e) => updateRequisites("legalName", e.target.value)} placeholder="ООО «Денте Клиник» или ИП Воронов А. В." />
								</div>
							</div>
							<div className="settings-studio-grid-3">
								<div className="settings-studio-field">
									<label htmlFor="input-inn">ИНН ({formatInnHint(settings.requisites.inn)})</label>
									<input id="input-inn" data-testid="input-inn" type="text" value={settings.requisites.inn} onChange={(e) => updateRequisites("inn", e.target.value)} placeholder="10 цифр (ООО) или 12 цифр (ИП)" />
								</div>
								<div className="settings-studio-field">
									<label htmlFor="input-ogrn">ОГРН / ОГРНИП</label>
									<input id="input-ogrn" data-testid="input-ogrn" type="text" value={settings.requisites.ogrn} onChange={(e) => updateRequisites("ogrn", e.target.value)} placeholder="13 цифр (ОГРН) или 15 (ОГРНИП)" />
								</div>
								<div className="settings-studio-field">
									<label htmlFor="input-license">Номер медицинской лицензии</label>
									<input id="input-license" data-testid="input-license" type="text" value={settings.requisites.medicalLicenseNumber} onChange={(e) => updateRequisites("medicalLicenseNumber", e.target.value)} placeholder="Л041-01137-77/00345678" />
								</div>
							</div>
							<div className="settings-studio-grid-2">
								<div className="settings-studio-field">
									<label htmlFor="input-actual-address">Фактический адрес клиники</label>
									<input id="input-actual-address" data-testid="input-actual-address" type="text" value={settings.requisites.actualAddress} onChange={(e) => updateRequisites("actualAddress", e.target.value)} placeholder="г. Москва, ул. Клиническая, д. 12" />
								</div>
								<div className="settings-studio-field">
									<label htmlFor="input-phone">Телефон для записи пациентов</label>
									<input id="input-phone" data-testid="input-phone" type="text" value={settings.requisites.phone} onChange={(e) => updateRequisites("phone", e.target.value)} placeholder="+7 (495) 777-88-99" />
								</div>
							</div>
							<div className="settings-studio-card-box">
								<h3 className="settings-studio-section-title"><Landmark size={16} aria-hidden="true" /><span>Банковские реквизиты и расчетный счет</span></h3>
								<div className="settings-studio-grid-3">
									<div className="settings-studio-field">
										<label htmlFor="input-bik">БИК Банка</label>
										<input id="input-bik" data-testid="input-bik" type="text" value={settings.requisites.bik} onChange={(e) => updateRequisites("bik", e.target.value)} placeholder="044525225" />
									</div>
									<div className="settings-studio-field">
										<label htmlFor="input-bank-name">Банк</label>
										<input id="input-bank-name" data-testid="input-bank-name" type="text" value={settings.requisites.bankName} onChange={(e) => updateRequisites("bankName", e.target.value)} placeholder="ПАО Сбербанк" />
									</div>
									<div className="settings-studio-field">
										<label htmlFor="input-checking-acc">Расчетный счет (20 цифр)</label>
										<input id="input-checking-acc" data-testid="input-checking-acc" type="text" value={settings.requisites.checkingAccount} onChange={(e) => updateRequisites("checkingAccount", e.target.value)} placeholder="40702810438000012345" />
									</div>
								</div>
							</div>
						</section>
					)}

					{activeTab === "schedule" && (
						<section className="settings-studio-section" aria-label="График работы и кресла">
							<div className="settings-studio-grid-2">
								<div className="settings-studio-card-box">
									<h3 className="settings-studio-section-title"><Clock size={16} aria-hidden="true" /><span>График работы клиники</span></h3>
									<div className="settings-studio-grid-2">
										<div className="settings-studio-field">
											<label htmlFor="input-weekday-hours">Будни (Пн-Пт)</label>
											<input id="input-weekday-hours" data-testid="input-weekday-hours" type="text" value={settings.schedule.weekdayHours} onChange={(e) => updateSchedule("weekdayHours", e.target.value)} />
										</div>
										<div className="settings-studio-field">
											<label htmlFor="input-weekend-hours">Выходные (Сб-Вс)</label>
											<input id="input-weekend-hours" data-testid="input-weekend-hours" type="text" value={settings.schedule.weekendHours} onChange={(e) => updateSchedule("weekendHours", e.target.value)} />
										</div>
									</div>
									<div className="flex items-center gap-2 pt-1 flex-wrap">
										<span className="text-xs text-[var(--muted)]">Рабочие дни:</span>
										{[{ d: 1, label: "Пн" }, { d: 2, label: "Вт" }, { d: 3, label: "Ср" }, { d: 4, label: "Чт" }, { d: 5, label: "Пт" }, { d: 6, label: "Сб" }, { d: 7, label: "Вс" }].map(({ d, label }) => (
											<button key={d} type="button" className={`settings-studio-badge ${settings.schedule.workingDays.includes(d) ? "active" : ""}`} onClick={() => toggleWorkingDay(d)}>{label}</button>
										))}
									</div>
								</div>
								<div className="settings-studio-card-box">
									<h3 className="settings-studio-section-title"><Wrench size={16} aria-hidden="true" /><span>Шаг расписания и санитарный интервал</span></h3>
									<div className="settings-studio-grid-2">
										<div className="settings-studio-field">
											<label htmlFor="select-slot-duration">Слот приёма по умолчанию</label>
											<select id="select-slot-duration" data-testid="select-slot-duration" value={settings.schedule.slotDurationMinutes} onChange={(e) => updateSchedule("slotDurationMinutes", Number(e.target.value))}>
												<option value={15}>15 минут</option>
												<option value={30}>30 минут (норма)</option>
												<option value={45}>45 минут</option>
												<option value={60}>60 минут</option>
											</select>
										</div>
										<div className="settings-studio-field">
											<label htmlFor="select-sanitary">Интервал обработки кресла</label>
											<select id="select-sanitary" data-testid="select-sanitary" value={settings.schedule.sanitaryIntervalMinutes} onChange={(e) => updateSchedule("sanitaryIntervalMinutes", Number(e.target.value))}>
												<option value={0}>Без интервала</option>
												<option value={10}>10 минут (норма)</option>
												<option value={15}>15 минут (хирургия)</option>
											</select>
										</div>
									</div>
								</div>
							</div>
							<div className="settings-studio-card-box">
								<div className="flex items-center justify-between">
									<h3 className="settings-studio-section-title"><Smartphone size={16} aria-hidden="true" /><span>Кресла клиники ({settings.chairs.length} из 5)</span></h3>
									<button type="button" className="settings-studio-preset-btn" data-testid="btn-add-chair" onClick={handleAddChair}>
										<Plus size={14} aria-hidden="true" /><span>Добавить кресло</span>
									</button>
								</div>
								<div className="settings-studio-chairs-list">
									{settings.chairs.map((chair) => (
										<div key={chair.id} className="settings-studio-chair-item" data-testid={`chair-row-${chair.id}`}>
											<div className="settings-studio-chair-info">
												<span className="settings-studio-chair-color-pill" style={{ backgroundColor: chair.color }} />
												<span className="settings-studio-chair-title">{chair.name}</span>
											</div>
											<div className="settings-studio-chair-toggles">
												<button type="button" className={`settings-studio-badge ${chair.hasXraySensor ? "active" : ""}`} onClick={() => toggleChairEquipment(chair.id, "hasXraySensor")}>
													{chair.hasXraySensor ? "✓ Визиограф" : "+ Визиограф"}
												</button>
												<button type="button" className={`settings-studio-badge ${chair.hasMicroscope ? "active" : ""}`} onClick={() => toggleChairEquipment(chair.id, "hasMicroscope")}>
													{chair.hasMicroscope ? "✓ Микроскоп" : "+ Микроскоп"}
												</button>
												<button type="button" className={`settings-studio-badge ${chair.hasSurgeryKit ? "active" : ""}`} onClick={() => toggleChairEquipment(chair.id, "hasSurgeryKit")}>
													{chair.hasSurgeryKit ? "✓ Хирургия" : "+ Хирургия"}
												</button>
												<button type="button" className="settings-studio-close-btn text-rose-500 hover:text-rose-600" onClick={() => handleDeleteChair(chair.id)} title="Удалить кресло" aria-label={`Удалить ${chair.name}`}>
													<Trash2 size={16} aria-hidden="true" />
												</button>
											</div>
										</div>
									))}
								</div>
							</div>
						</section>
					)}

					{activeTab === "staff" && (
						<section className="settings-studio-section" aria-label="Врачи и сотрудники">
							<div className="settings-studio-card-box">
								<h3 className="settings-studio-section-title"><Users size={16} aria-hidden="true" /><span>Быстрое добавление врача или ассистента</span></h3>
								<div className="flex items-center gap-3 flex-wrap">
									<div className="settings-studio-field flex-1 min-w-[200px]">
										<input data-testid="input-staff-name" type="text" placeholder="ФИО нового врача / ассистента" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} />
									</div>
									<div className="settings-studio-field min-w-[160px]">
										<select data-testid="select-staff-role" value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value as any)}>
											<option value="doctor">Врач-стоматолог</option>
											<option value="assistant">Ассистент</option>
											<option value="administrator">Администратор</option>
											<option value="manager">Управляющий</option>
										</select>
									</div>
									<button type="button" className="settings-studio-preset-btn" data-testid="btn-add-staff" onClick={handleAddStaff}>
										<Plus size={14} aria-hidden="true" /><span>Добавить в штат</span>
									</button>
								</div>
							</div>
							<div className="settings-studio-staff-grid">
								{settings.staff.map((member) => (
									<div key={member.id} className="settings-studio-staff-item" data-testid={`staff-row-${member.id}`}>
										<div className="flex items-center justify-between">
											<span className="settings-studio-staff-name">{member.fullName}</span>
											<button type="button" className="settings-studio-close-btn text-rose-500 hover:text-rose-600" onClick={() => handleDeleteStaff(member.id)} title="Удалить сотрудника" aria-label={`Удалить ${member.fullName}`}>
												<Trash2 size={16} aria-hidden="true" />
											</button>
										</div>
										<div className="settings-studio-staff-meta">
											<span className="settings-studio-pill-tag">{ROLE_LABELS[member.role] || member.role}</span>
											<span className="settings-studio-pill-tag">{SPECIALTY_LABELS[member.specialty] || member.specialty}</span>
											<span>{member.phone}</span>
										</div>
									</div>
								))}
							</div>
						</section>
					)}

					{activeTab === "integrations" && (
						<section className="settings-studio-section" aria-label="Интеграции и фискализация">
							<div className="settings-studio-integrations-grid">
								<div className="settings-studio-integration-card">
									<div className="settings-studio-integration-header">
										<h4 className="font-bold text-sm m-0">Мессенджеры (WhatsApp & Telegram)</h4>
										<span className="settings-studio-status-pill connected">✓ Активен</span>
									</div>
									<p className="text-xs text-[var(--muted)] m-0">Автоматические напоминания о приёме, подтверждение визита и сервисные опросы.</p>
								</div>
								<div className="settings-studio-integration-card">
									<div className="settings-studio-integration-header">
										<h4 className="font-bold text-sm m-0">Касса и фискальный регистратор</h4>
										<span className="settings-studio-status-pill ready">✓ Подключен (Атол/Штрих-М)</span>
									</div>
									<p className="text-xs text-[var(--muted)] m-0">Печать чеков приёма, QR-код СБП на экране терминала, комбинированная оплата.</p>
								</div>
								<div className="settings-studio-integration-card">
									<div className="settings-studio-integration-header">
										<h4 className="font-bold text-sm m-0">ЕГИСЗ контур (РЭМД)</h4>
										<span className="settings-studio-status-pill connected">✓ Шлюз готов</span>
									</div>
									<p className="text-xs text-[var(--muted)] m-0">OID организации: {settings.integrations.egiszOid}. Автовыгрузка электронных медзаписей.</p>
								</div>
								<div className="settings-studio-integration-card">
									<div className="settings-studio-integration-header">
										<h4 className="font-bold text-sm m-0">Визиографы и снимки томографа</h4>
										<span className="settings-studio-status-pill ready">✓ Горячая папка активна</span>
									</div>
									<p className="text-xs text-[var(--muted)] m-0">Мгновенный автоимпорт DICOM/JPEG снимков с датчиков Planmeca, Vatech, KaVo.</p>
								</div>
							</div>
						</section>
					)}
				</main>

				<footer className="settings-studio-footer">
					<div className="settings-studio-footer-status">
						<Check size={16} className="text-emerald-500" aria-hidden="true" />
						<span>{saveFeedback}</span>
					</div>
					<button type="button" className="settings-studio-primary-cta" data-testid="btn-save-clinic-settings-ssot" onClick={handleExplicitSave} disabled={false}>
						<ShieldCheck size={18} aria-hidden="true" />
						<span>✓ Сохранить настройки клиники</span>
					</button>
				</footer>
			</div>
		</div>
	);
};

export default SettingsStudioModal;
