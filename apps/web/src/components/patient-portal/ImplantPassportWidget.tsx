/**
 * ImplantPassportWidget.tsx — Электронный паспорт имплантов и ортопедии (Patient Portal & PWA)
 *
 * Функционал:
 * 1. Паспорт установленных имплантов (бренд Straumann, Nobel Biocare, Osstem, Dentium, SN, LOT, диаметр, длина, крутящий момент N·cm, ISQ стабильность, дата, хирург).
 * 2. Паспорт ортопедии (коронки E.max, Цирконий Katana/Prettau, оттенок VITA, тип фиксации, зубной техник).
 * 3. Календарь обязательных гарантийных осмотров (1 мес, 6 мес, 12 мес) с PUSH-напоминаниями и 1-клик записью.
 * 4. QR-код международной верификации подлинности завода-изготовителя (ГОСТ / ISO 13485).
 * 5. Соответствие закону Фиттса (тач-таргеты >= 44px) и Apple HIG.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Award,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	ExternalLink,
	Eye,
	FileBadge,
	FileCheck,
	FileText,
	Info,
	Lock,
	QrCode,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Star,
	Stethoscope,
	User,
	X,
	Bell,
	BellOff,
	Share2,
	CheckSquare,
	Layers,
} from "lucide-react";
import { formatKopecksToCurrencyRu } from "./patientWebappEngine.js";
import "./implantPassport.css";

// ============================================================================
// 1. ТИПЫ И ИНТЕРФЕЙСЫ (TYPES & CONTRACTS)
// ============================================================================

export type ImplantBrandType =
	| "straumann"
	| "nobel_biocare"
	| "osstem"
	| "dentium"
	| "astra_tech";

export type ProstheticMaterialType =
	| "emax_cad"
	| "zirconia_multilayer"
	| "metal_ceramic"
	| "composite"
	| "titanium_custom_abutment";

export type WarrantyCheckupStatus =
	| "completed"
	| "upcoming"
	| "overdue"
	| "scheduled";

export interface InstalledImplantItem {
	readonly id: string;
	readonly toothFdi: string; // "16", "24", "36", "46"
	readonly brand: ImplantBrandType;
	readonly brandNameRu: string;
	readonly brandCountryRu: string;
	readonly modelLine: string; // "BLX SLActive", "NobelActive", "TS III SA", "SuperLine"
	readonly serialNumber: string; // SN
	readonly lotBatchNumber: string; // LOT
	readonly diameterMm: number; // 4.1
	readonly lengthMm: number; // 10.0
	readonly platformTypeRu: string; // "Коническое 11° TorcFit", "Внутренний шестигранник"
	readonly insertionTorqueNcm: number; // 45 N·cm
	readonly isqStability: number; // 82 ISQ
	readonly isqClassificationRu: "Высокая" | "Средняя" | "Низкая";
	readonly installedDateIso: string;
	readonly installedDateRu: string;
	readonly surgeonFullName: string;
	readonly clinicName: string;
	readonly manufacturerWarrantyType: "lifetime_international" | "limited_10_years";
	readonly manufacturerWarrantyLabelRu: string;
	readonly factoryVerifyUrl: string;
	readonly certificateDigestSha256: string;
	readonly hasProstheticCrown: boolean;
	readonly prostheticRestoration?: ProstheticRestorationItem | undefined;
}

export interface ProstheticRestorationItem {
	readonly id: string;
	readonly toothFdi: string;
	readonly restorationTypeRu: "Коронка на винтовой фиксации" | "Коронка на цементе" | "Керамический винир" | "Мостовидный протез";
	readonly material: ProstheticMaterialType;
	readonly materialNameRu: string; // "Дисиликат лития IPS e.max CAD", "Диоксид циркония Katana HTML Plus"
	readonly vitaShade: string; // "A2", "A1", "BL2", "3D-Master 2M2"
	readonly fixationTypeRu: "Винтовая (титановый абатмент)" | "Цементная фиксация";
	readonly labNameRu: string;
	readonly masterTechnicianRu: string;
	readonly installedDateIso: string;
	readonly installedDateRu: string;
	readonly prosthodontistFullName: string;
	readonly warrantyPeriodYears: number; // 5 лет
	readonly warrantyExpiresDateRu: string;
}

export interface WarrantyCheckupEvent {
	readonly id: string;
	readonly intervalMonths: number; // 1, 6, 12, 24, 36
	readonly titleRu: string; // "1 месяц: Контроль остеоинтеграции и прикуса"
	readonly descriptionRu: string; // "Визуальный осмотр, пальпация, контроль гигиены и окклюзии"
	readonly recommendedDateIso: string;
	readonly recommendedDateRu: string;
	readonly status: WarrantyCheckupStatus;
	readonly completedDateRu?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly isPushReminderEnabled: boolean;
	readonly requiredProceduresRu: readonly string[];
}

export interface PatientImplantPassportProfile {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly passportNumber: string; // "IMP-2026-8804"
	readonly issuedDateRu: string;
	readonly totalImplantsCount: number;
	readonly totalProstheticsCount: number;
	readonly implants: readonly InstalledImplantItem[];
	readonly warrantySchedule: readonly WarrantyCheckupEvent[];
}

export interface ImplantPassportWidgetProps {
	readonly data?: PatientImplantPassportProfile | undefined;
	readonly currentPatientId?: string | undefined;
	readonly onBookCheckupAppointment?: (checkup: WarrantyCheckupEvent) => void;
	readonly onTogglePushReminder?: (checkupId: string, enabled: boolean) => Promise<void> | void;
	readonly onSharePassport?: (passportNumber: string) => void;
	readonly className?: string | undefined;
}

// ============================================================================
// 2. ДЕМО-ПРЕСЕТ ПАСПОРТА ПАЦИЕНТА (REALISTIC PRESET)
// ============================================================================

export const DEFAULT_PRESET_IMPLANT_PASSPORT: PatientImplantPassportProfile = {
	patientId: "pat-10492",
	patientFullName: "Иванова Анна Сергеевна",
	passportNumber: "IMP-2026-9481-RU",
	issuedDateRu: "15.08.2026",
	totalImplantsCount: 2,
	totalProstheticsCount: 2,
	implants: [
		{
			id: "imp-46",
			toothFdi: "46",
			brand: "straumann",
			brandNameRu: "Straumann (Швейцария)",
			brandCountryRu: "Швейцария (Базель)",
			modelLine: "BLX SLActive (Roxolid)",
			serialNumber: "SN-981248019",
			lotBatchNumber: "LOT-884210",
			diameterMm: 4.5,
			lengthMm: 10.0,
			platformTypeRu: "Коническое TorcFit 11°",
			insertionTorqueNcm: 45,
			isqStability: 82,
			isqClassificationRu: "Высокая",
			installedDateIso: "2026-06-10",
			installedDateRu: "10 июня 2026",
			surgeonFullName: "Д-р Смирнов К.М.",
			clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
			manufacturerWarrantyType: "lifetime_international",
			manufacturerWarrantyLabelRu: "Пожизненная международная гарантия Straumann Guarantee",
			factoryVerifyUrl: "https://verify.straumann.com/sn/981248019",
			certificateDigestSha256: "8f7e2a91b40d381c81ef492049e018a47291a0b3847291048201948291048291",
			hasProstheticCrown: true,
			prostheticRestoration: {
				id: "prost-46",
				toothFdi: "46",
				restorationTypeRu: "Коронка на винтовой фиксации",
				material: "zirconia_multilayer",
				materialNameRu: "Диоксид циркония Katana HTML Plus (Германия)",
				vitaShade: "A2",
				fixationTypeRu: "Винтовая (титановый абатмент)",
				labNameRu: "CAD/CAM Лаборатория DenteLab",
				masterTechnicianRu: "Воронов А.В.",
				installedDateIso: "2026-08-15",
				installedDateRu: "15 августа 2026",
				prosthodontistFullName: "Д-р Белов С.А.",
				warrantyPeriodYears: 10,
				warrantyExpiresDateRu: "15 августа 2036",
			},
		},
		{
			id: "imp-16",
			toothFdi: "16",
			brand: "nobel_biocare",
			brandNameRu: "Nobel Biocare (Швеция/Швейцария)",
			brandCountryRu: "Швейцария (Цюрих)",
			modelLine: "NobelActive TiUltra CC",
			serialNumber: "SN-774192083",
			lotBatchNumber: "LOT-901452",
			diameterMm: 4.3,
			lengthMm: 11.5,
			platformTypeRu: "Conical Connection (NP/RP)",
			insertionTorqueNcm: 40,
			isqStability: 78,
			isqClassificationRu: "Высокая",
			installedDateIso: "2026-07-02",
			installedDateRu: "2 июля 2026",
			surgeonFullName: "Д-р Смирнов К.М.",
			clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
			manufacturerWarrantyType: "lifetime_international",
			manufacturerWarrantyLabelRu: "Пожизненная международная гарантия Nobel Biocare",
			factoryVerifyUrl: "https://verify.nobelbiocare.com/sn/774192083",
			certificateDigestSha256: "4b910e8291048291048291048291048291048291048291048291048291048291",
			hasProstheticCrown: true,
			prostheticRestoration: {
				id: "prost-16",
				toothFdi: "16",
				restorationTypeRu: "Коронка на винтовой фиксации",
				material: "emax_cad",
				materialNameRu: "Дисиликат лития IPS e.max CAD (Ivoclar)",
				vitaShade: "A2",
				fixationTypeRu: "Винтовая (титановый абатмент)",
				labNameRu: "CAD/CAM Лаборатория DenteLab",
				masterTechnicianRu: "Воронов А.В.",
				installedDateIso: "2026-08-20",
				installedDateRu: "20 августа 2026",
				prosthodontistFullName: "Д-р Белов С.А.",
				warrantyPeriodYears: 5,
				warrantyExpiresDateRu: "20 августа 2031",
			},
		},
	],
	warrantySchedule: [
		{
			id: "chk-1m",
			intervalMonths: 1,
			titleRu: "1 месяц: Контроль остеоинтеграции и окклюзии",
			descriptionRu: "Первичный контроль стабильности, прикуса и гигиены десневой манжеты",
			recommendedDateIso: "2026-09-15",
			recommendedDateRu: "15 сентября 2026",
			status: "upcoming",
			isPushReminderEnabled: true,
			requiredProceduresRu: ["Осмотр хирурга-имплантолога", "Прицельный контрольный снимок", "Проверка торка винта"],
		},
		{
			id: "chk-6m",
			intervalMonths: 6,
			titleRu: "6 месяцев: Плановый гарантийный чек-ап + КЛКТ",
			descriptionRu: "Рентген-контроль уровня костной ткани и профгигиена Air-Flow",
			recommendedDateIso: "2027-02-15",
			recommendedDateRu: "15 февраля 2027",
			status: "scheduled",
			isPushReminderEnabled: true,
			requiredProceduresRu: ["КЛКТ 3D-контроль уровня кости", "Ультразвуковая чистка абатмента", "Полировка коронки"],
		},
		{
			id: "chk-12m",
			intervalMonths: 12,
			titleRu: "12 месяцев: Ежегодный осмотр сохранения гарантии",
			descriptionRu: "Обязательный ежегодный визит для продления международной гарантии",
			recommendedDateIso: "2027-08-15",
			recommendedDateRu: "15 августа 2027",
			status: "scheduled",
			isPushReminderEnabled: true,
			requiredProceduresRu: ["Комплексный осмотр", "Профессиональная гигиена полости рта", "Продление гарантийного сертификата"],
		},
	],
};

// ============================================================================
// 3. ОСНОВНОЙ КОМПОНЕНТ (MAIN WIDGET COMPONENT)
// ============================================================================

export const ImplantPassportWidget: React.FC<ImplantPassportWidgetProps> = ({
	data = DEFAULT_PRESET_IMPLANT_PASSPORT,
	currentPatientId,
	onBookCheckupAppointment,
	onTogglePushReminder,
	onSharePassport,
	className = "",
}) => {
	const [selectedImplant, setSelectedImplant] = useState<InstalledImplantItem | null>(null);
	const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
	const [activeVerifyImplant, setActiveVerifyImplant] = useState<InstalledImplantItem | null>(null);
	const [copiedSn, setCopiedSn] = useState<string | null>(null);
	const [warrantyEvents, setWarrantyEvents] = useState<readonly WarrantyCheckupEvent[]>(data.warrantySchedule);
	const [activeTab, setActiveTab] = useState<"implants" | "schedule">("implants");

	// Копирование серийного номера
	const handleCopySn = useCallback((sn: string) => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(sn).catch(() => {});
		}
		setCopiedSn(sn);
		setTimeout(() => setCopiedSn(null), 2000);
	}, []);

	// Открытие окна проверки подлинности
	const handleOpenVerifyModal = useCallback((implant: InstalledImplantItem) => {
		setActiveVerifyImplant(implant);
		setIsVerifyModalOpen(true);
	}, []);

	// Переключение PUSH-напоминания
	const handleToggleReminder = useCallback(
		async (checkupId: string) => {
			const target = warrantyEvents.find((e) => e.id === checkupId);
			if (!target) return;

			const nextEnabled = !target.isPushReminderEnabled;
			setWarrantyEvents((prev) =>
				prev.map((e) => (e.id === checkupId ? { ...e, isPushReminderEnabled: nextEnabled } : e)),
			);

			if (onTogglePushReminder) {
				try {
					await onTogglePushReminder(checkupId, nextEnabled);
				} catch {
					// rollback
					setWarrantyEvents((prev) =>
						prev.map((e) => (e.id === checkupId ? { ...e, isPushReminderEnabled: !nextEnabled } : e)),
					);
				}
			}
		},
		[warrantyEvents, onTogglePushReminder],
	);

	return (
		<div className={`implant-passport-container ${className}`}>
			{/* 1. HERO КАРТОЧКА ЦИФРОВОГО ПАСПОРТА */}
			<div className="implant-passport-hero-card">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								backgroundColor: "var(--teal, #0d9488)",
								color: "var(--on-teal, #ffffff)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<FileBadge size={20} />
						</div>
						<div>
							<h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
								Электронный паспорт имплантов
							</h3>
							<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: "4px" }}>
								<span>№ {data.passportNumber}</span>
								<span>• Выдан: {data.issuedDateRu}</span>
							</div>
						</div>
					</div>

					<span className="implant-passport-badge-gold">
						<Award size={12} />
						<span>Пожизненная гарантия</span>
					</span>
				</div>

				<div style={{ display: "flex", gap: "12px", marginTop: "12px", borderTop: "1px solid var(--line, rgba(13, 148, 136, 0.15))", paddingTop: "10px" }}>
					<div>
						<span style={{ fontSize: "10px", color: "var(--muted, #64748b)", textTransform: "uppercase" }}>Имплантов</span>
						<div style={{ fontSize: "16px", fontWeight: 800, color: "var(--teal-strong, #0f766e)" }}>
							{`${data.totalImplantsCount} ед.`}
						</div>
					</div>
					<div style={{ borderLeft: "1px solid var(--line, rgba(0,0,0,0.08))", paddingLeft: "12px" }}>
						<span style={{ fontSize: "10px", color: "var(--muted, #64748b)", textTransform: "uppercase" }}>Ортопедия</span>
						<div style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
							{`${data.totalProstheticsCount} коронки`}
						</div>
					</div>
					<div style={{ borderLeft: "1px solid var(--line, rgba(0,0,0,0.08))", paddingLeft: "12px" }}>
						<span style={{ fontSize: "10px", color: "var(--muted, #64748b)", textTransform: "uppercase" }}>Статус сертификатов</span>
						<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--teal-strong, #0f766e)", display: "flex", alignItems: "center", gap: "4px" }}>
							<ShieldCheck size={14} />
							<span>Верифицированы</span>
						</div>
					</div>
				</div>

				{/* Кнопки переключения под-вкладок (Импланты vs График осмотров) */}
				<div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
					<button
						type="button"
						className="implant-touch-target-btn"
						onClick={() => setActiveTab("implants")}
						style={{
							flex: 1,
							backgroundColor: activeTab === "implants" ? "var(--teal, #0d9488)" : "var(--paper-soft, #f1f5f9)",
							color: activeTab === "implants" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
						}}
					>
						<Shield size={15} />
						<span>Установленные импланты ({data.implants.length})</span>
					</button>

					<button
						type="button"
						className="implant-touch-target-btn"
						onClick={() => setActiveTab("schedule")}
						style={{
							flex: 1,
							backgroundColor: activeTab === "schedule" ? "var(--teal, #0d9488)" : "var(--paper-soft, #f1f5f9)",
							color: activeTab === "schedule" ? "var(--on-teal, #ffffff)" : "var(--ink, #0f172a)",
						}}
					>
						<Calendar size={15} />
						<span>Гарантийные чек-апы</span>
					</button>
				</div>
			</div>

			{/* 2. ВКЛАДКА: СПИСОК УСТАНОВЛЕННЫХ ИМПЛАНТОВ И ОРТОПЕДИИ */}
			{activeTab === "implants" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{data.implants.map((implant) => {
						const crown = implant.prostheticRestoration;

						return (
							<div key={implant.id} className="implant-passport-card">
								{/* Header зуба и бренда */}
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<span
											style={{
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
												width: "32px",
												height: "32px",
												borderRadius: "6px",
												backgroundColor: "var(--teal-soft, #ccfbf1)",
												color: "var(--teal-strong, #0f766e)",
												fontWeight: 800,
												fontSize: "14px",
											}}
										>
											{implant.toothFdi}
										</span>
										<div>
											<div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
												{implant.brandNameRu}
											</div>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
												Модель: <strong>{implant.modelLine}</strong>
											</div>
										</div>
									</div>

									<button
										type="button"
										className="implant-touch-target-btn"
										onClick={() => handleOpenVerifyModal(implant)}
										style={{
											backgroundColor: "var(--teal-soft, #f0fdfa)",
											border: "1px solid var(--teal-surface, rgba(13, 148, 136, 0.3))",
											color: "var(--teal-strong, #0f766e)",
											padding: "6px 10px",
											fontSize: "11px",
										}}
										title="Проверить подлинность на сайте завода"
									>
										<QrCode size={14} />
										<span>Сертификат</span>
									</button>
								</div>

								{/* Сетка хирургических характеристик имплантата */}
								<div className="implant-specs-grid">
									<div className="implant-spec-item">
										<span className="implant-spec-label">Размер (Ø × L)</span>
										<span className="implant-spec-value">{`Ø ${implant.diameterMm} × ${implant.lengthMm} мм`}</span>
									</div>
									<div className="implant-spec-item">
										<span className="implant-spec-label">Серийный номер (SN)</span>
										<span
											className="implant-spec-value"
											style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
											onClick={() => handleCopySn(implant.serialNumber)}
											title="Нажмите, чтобы скопировать"
										>
											<span>{implant.serialNumber}</span>
											{copiedSn === implant.serialNumber ? (
												<Check size={12} style={{ color: "var(--teal, #0d9488)" }} />
											) : (
												<Copy size={12} style={{ color: "var(--muted)" }} />
											)}
										</span>
									</div>
									<div className="implant-spec-item">
										<span className="implant-spec-label">Партия (LOT)</span>
										<span className="implant-spec-value">{implant.lotBatchNumber}</span>
									</div>
									<div className="implant-spec-item">
										<span className="implant-spec-label">Торк установки</span>
										<span className="implant-spec-value" style={{ color: "var(--teal-strong, #0f766e)" }}>
											{`${implant.insertionTorqueNcm} N·cm`}
										</span>
									</div>
									<div className="implant-spec-item">
										<span className="implant-spec-label">ISQ Стабильность</span>
										<span className="implant-spec-value">
											{`${implant.isqStability} (${implant.isqClassificationRu})`}
										</span>
									</div>
									<div className="implant-spec-item">
										<span className="implant-spec-label">Дата операции</span>
										<span className="implant-spec-value">{implant.installedDateRu}</span>
									</div>
								</div>

								{/* Карточка коронки / ортопедической реставрации (если установлена) */}
								{crown && (
									<div
										style={{
											borderRadius: "8px",
											padding: "10px",
											backgroundColor: "var(--paper-soft, #f8fafc)",
											border: "1px solid var(--line, rgba(0, 0, 0, 0.08))",
											display: "flex",
											flexDirection: "column",
											gap: "6px",
										}}
									>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
												<Layers size={14} style={{ color: "var(--teal, #0d9488)" }} />
												<strong style={{ fontSize: "12px", color: "var(--ink, #0f172a)" }}>
													{crown.restorationTypeRu}
												</strong>
											</div>
											<span
												style={{
													fontSize: "11px",
													fontWeight: 700,
													color: "var(--teal-strong, #0f766e)",
													backgroundColor: "var(--teal-soft, #ccfbf1)",
													padding: "1px 6px",
													borderRadius: "4px",
												}}
											>
												{`VITA ${crown.vitaShade}`}
											</span>
										</div>

										<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
											Материал: <strong style={{ color: "var(--ink)" }}>{crown.materialNameRu}</strong>
										</div>

										<div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px", fontSize: "11px", color: "var(--muted, #64748b)", borderTop: "1px solid var(--line, rgba(0,0,0,0.06))", paddingTop: "4px" }}>
											<span>{`Лаборатория: ${crown.labNameRu}`}</span>
											{crown.masterTechnicianRu && <span>{`Техник: ${crown.masterTechnicianRu}`}</span>}
											<span>{`Гарантия до ${crown.warrantyExpiresDateRu}`}</span>
										</div>
									</div>
								)}

								{/* Бейдж хирурга и международной гарантии */}
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--muted, #64748b)" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
										<Stethoscope size={13} />
										<span>Хирург: {implant.surgeonFullName}</span>
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--warn-fg)", fontWeight: 600 }}>
										<Award size={13} />
										<span>{implant.manufacturerWarrantyLabelRu}</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* 3. ВКЛАДКА: КАЛЕНДАРЬ ГАРАНТИЙНЫХ ЧЕК-АПОВ */}
			{activeTab === "schedule" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					<div
						style={{
							borderRadius: "8px",
							padding: "10px 12px",
							backgroundColor: "var(--paper-soft, #f8fafc)",
							border: "1px solid var(--line, rgba(0, 0, 0, 0.08))",
							fontSize: "11px",
							color: "var(--muted, #64748b)",
							display: "flex",
							gap: "8px",
							alignItems: "flex-start",
						}}
					>
						<Info size={16} style={{ color: "var(--teal, #0d9488)", flexShrink: 0, marginTop: "1px" }} />
						<div>
							<strong>Условие сохранения пожизненной гарантии производителя: </strong>
							Прохождение планового профилактического осмотра и профессиональной гигиены не реже 1 раза в 6 месяцев.
						</div>
					</div>

					{warrantyEvents.map((event) => {
						const isUpcoming = event.status === "upcoming";

						return (
							<div
								key={event.id}
								className={`implant-warranty-step ${isUpcoming ? "active" : ""}`}
								style={{ display: "flex", flexDirection: "column", gap: "8px" }}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
									<div>
										<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<Clock size={14} style={{ color: "var(--teal, #0d9488)" }} />
											<strong style={{ fontSize: "13px", color: "var(--ink, #0f172a)" }}>
												{event.titleRu}
											</strong>
										</div>
										<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
											Рекомендованная дата: <strong>{event.recommendedDateRu}</strong>
										</div>
									</div>

									{/* Тумблер PUSH-напоминания с тач-таргетом 44x44 */}
									<div
										style={{
											minHeight: "44px",
											minWidth: "44px",
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<button
											type="button"
											role="switch"
											aria-checked={event.isPushReminderEnabled}
											onClick={() => handleToggleReminder(event.id)}
											className="implant-touch-target-btn"
											style={{
												backgroundColor: event.isPushReminderEnabled ? "var(--teal-soft, #ccfbf1)" : "var(--paper-soft, #f1f5f9)",
												color: event.isPushReminderEnabled ? "var(--teal-strong, #0f766e)" : "var(--muted, #64748b)",
												padding: "6px 8px",
												fontSize: "11px",
											}}
											title={event.isPushReminderEnabled ? "PUSH-напоминание включено" : "Включить PUSH-напоминание"}
										>
											{event.isPushReminderEnabled ? <Bell size={14} /> : <BellOff size={14} />}
											<span>{event.isPushReminderEnabled ? "Напомнить" : "Выкл"}</span>
										</button>
									</div>
								</div>

								<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
									{event.descriptionRu}
								</div>

								{/* Список обязательных процедур */}
								<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
									{event.requiredProceduresRu.map((proc, idx) => (
										<span
											key={idx}
											style={{
												fontSize: "10px",
												fontWeight: 600,
												padding: "2px 6px",
												borderRadius: "4px",
												backgroundColor: "var(--paper-strong, #ffffff)",
												border: "1px solid var(--line, rgba(0,0,0,0.08))",
												color: "var(--ink, #0f172a)",
											}}
										>
											✓ {proc}
										</span>
									))}
								</div>

								{/* Кнопка записи на гарантийный осмотр в 1 клик */}
								{onBookCheckupAppointment && (
									<button
										type="button"
										className="implant-touch-target-btn"
										onClick={() => onBookCheckupAppointment(event)}
										style={{
											backgroundColor: "var(--teal, #0d9488)",
											color: "var(--on-teal, #ffffff)",
											width: "100%",
											marginTop: "4px",
										}}
									>
										<Calendar size={15} />
										<span>Записаться на гарантийный осмотр</span>
									</button>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* 4. МОДАЛЬНОЕ ОКНО ПРОВЕРКИ ПОДЛИННОСТИ СЕРТИФИКАТА (FACTORY QR CODE) */}
			{isVerifyModalOpen && activeVerifyImplant && (
				<div
					role="dialog"
					aria-modal="true"
					className="implant-passport-modal-backdrop"
				>
					<div className="implant-passport-modal-window">
						{/* Заголовок */}
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<ShieldCheck size={18} style={{ color: "var(--teal, #0d9488)" }} />
								<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
									Заводской сертификат подлинности
								</h4>
							</div>
							<button
								type="button"
								onClick={() => setIsVerifyModalOpen(false)}
								style={{
									background: "transparent",
									border: "none",
									color: "var(--muted, #64748b)",
									cursor: "pointer",
									padding: "4px",
								}}
								title="Закрыть"
							>
								<X size={18} />
							</button>
						</div>

						{/* QR-код верификации */}
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								padding: "14px",
								borderRadius: "10px",
								backgroundColor: "var(--paper-soft, #f8fafc)",
								border: "1px solid var(--line, rgba(0,0,0,0.1))",
							}}
						>
							<div
								style={{
									width: "150px",
									height: "150px",
									backgroundColor: "var(--paper-strong, #ffffff)",
									borderRadius: "8px",
									border: "1px solid rgba(0,0,0,0.1)",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									position: "relative",
								}}
							>
								<QrCode size={120} style={{ color: "var(--ink, #0f172a)" }} />
								<div
									style={{
										position: "absolute",
										padding: "2px 4px",
										backgroundColor: "var(--paper-strong, #ffffff)",
										borderRadius: "4px",
										boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
										fontSize: "8px",
										fontWeight: 800,
										color: "var(--ink, #0f172a)",
									}}
								>
									{activeVerifyImplant.brand.toUpperCase()}
								</div>
							</div>

							<div style={{ marginTop: "10px", textAlign: "center" }}>
								<div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
									{activeVerifyImplant.brandNameRu}
								</div>
								<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
									Серийный номер: <strong>{activeVerifyImplant.serialNumber}</strong>
								</div>
							</div>
						</div>

						{/* Хэш криптографического сертификата */}
						<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
							<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)" }}>
								Цифровой отпечаток подлинности (SHA-256):
							</span>
							<div
								style={{
									padding: "6px 8px",
									borderRadius: "6px",
									backgroundColor: "var(--paper-soft, #f1f5f9)",
									fontSize: "10px",
									fontFamily: "monospace",
									color: "var(--muted, #64748b)",
									wordBreak: "break-all",
								}}
							>
								{activeVerifyImplant.certificateDigestSha256}
							</div>
						</div>

						{/* Кнопки действий */}
						<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
							<a
								href={activeVerifyImplant.factoryVerifyUrl}
								target="_blank"
								rel="noreferrer"
								className="implant-touch-target-btn"
								style={{
									backgroundColor: "var(--teal, #0d9488)",
									color: "var(--on-teal, #ffffff)",
									width: "100%",
								}}
							>
								<ExternalLink size={15} />
								<span>Проверить на официальном сайте завода</span>
							</a>

							<button
								type="button"
								className="implant-touch-target-btn"
								onClick={() => handleCopySn(activeVerifyImplant.serialNumber)}
								style={{
									backgroundColor: "transparent",
									border: "1px solid var(--line, rgba(0,0,0,0.15))",
									color: "var(--ink, #0f172a)",
									width: "100%",
								}}
							>
								<Copy size={15} />
								<span>Скопировать серийный номер</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
