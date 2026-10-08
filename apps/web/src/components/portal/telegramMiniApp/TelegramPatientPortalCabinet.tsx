/**
 * DENTE POCKET CLINIC — Полноценный карманный кабинет пациента в Telegram WebApp
 * (DOMAIN: TELEGRAM MINI APPS & PATIENT RETENTION HUB)
 *
 * Стандарты (Apple HIG & Anti-Desktop-Squeeze):
 * - Таб-навигация в стиле нативного iOS:
 *   1. 🦷 [Зубы и симптомы] — интерактивная формула жалоб FDI 32 + 20 с нативной шторкой
 *   2. 📅 [Мои записи] — предстоящие и архивные визиты, подтверждение/перенос в 1 клик
 *   3. 🖼️ [Снимки и КТ] — просмотр рентгенограмм RVG и 3D КТ с зумом, инверсией и пометками врача
 *   4. 🧾 [Справка для налоговой (13% НДФЛ)] — оформление заявления на налоговый вычет (КНД 1151156)
 *   5. 💳 [Финансы и кэшбэк] — баланс бонусов, депозитный счет, реферальная программа
 * - Сенсорный минимум: все кнопки >= 48px, безопасные зоны env(safe-area-inset-bottom)
 * - 0px паразитного горизонтального скролла (overflow-x: clip; max-width: 480px)
 * - Темизация: чистые токены var(--paper), var(--ink), var(--teal), var(--line), без белых пятен в Dark Mode!
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	CreditCard,
	Download,
	Eye,
	FileCheck2,
	FileText,
	HelpCircle,
	Info,
	MapPin,
	Phone,
	QrCode,
	RefreshCw,
	RotateCcw,
	Share2,
	ShieldCheck,
	Sparkles,
	Star,
	User,
	Users,
	Wallet,
	X,
	Zap,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import "./telegramMiniApp.css";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	TelegramInteractiveToothPicker,
	type ToothComplaint,
} from "./TelegramInteractiveToothPicker";
import { TelegramMiniAppBooking } from "./TelegramMiniAppBooking";

export type TelegramCabinetTab =
	| "teeth"
	| "appointments"
	| "imaging"
	| "tax"
	| "finance";

export interface PatientAppointment {
	readonly id: string;
	readonly dateStr: string; // "12 октября 2026"
	readonly timeStr: string; // "14:00"
	readonly doctorName: string;
	readonly doctorRole: string;
	readonly cabinet: string;
	readonly procedureTitle: string;
	readonly durationMinutes: number;
	readonly isConfirmed: boolean;
	readonly isPast: boolean;
	readonly costRub?: number | undefined;
	readonly cashbackEarned?: number | undefined;
	readonly toothNumber?: number | undefined;
}

export interface PatientImagingScan {
	readonly id: string;
	readonly title: string;
	readonly scanType: "rvg_2d" | "cbct_3d" | "optg_pano";
	readonly scanTypeLabel: string;
	readonly dateStr: string;
	readonly doctorName: string;
	readonly radiationDoseMsv: number;
	readonly doctorNotes: string;
	readonly targetTooth?: number | undefined;
	readonly diagnosisBadge: string;
	readonly markerCoords?: { x: number; y: number } | undefined;
}

export interface TelegramPatientPortalCabinetProps {
	readonly organizationId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly initialTab?: TelegramCabinetTab;
	readonly initialTaxSheetOpen?: boolean;
	readonly onBack?: () => void;
}

const DEMO_FAMILY_MEMBERS = [
	{ id: "self", name: "Александр (Я)", relation: "self" },
	{ id: "child-1", name: "Артём (Сын, 8 лет)", relation: "child" },
	{ id: "child-2", name: "София (Дочь, 12 лет)", relation: "child" },
];

const DEMO_APPOINTMENTS: PatientAppointment[] = [
	{
		id: "app-upcoming-1",
		dateStr: "Четверг, 12 октября 2026",
		timeStr: "14:00",
		doctorName: "Д-р Смирнов Алексей Васильевич",
		doctorRole: "Терапевт-эндодонтист",
		cabinet: "Кабинет 3 (Терапия)",
		procedureTitle: "Лечение кариеса дентина зуба 16, реставрация",
		durationMinutes: 60,
		isConfirmed: false,
		isPast: false,
		toothNumber: 16,
	},
	{
		id: "app-upcoming-2",
		dateStr: "Понедельник, 19 октября 2026",
		timeStr: "16:30",
		doctorName: "Д-р Воронов Алексей Владимирович",
		doctorRole: "Хирург-имплантолог",
		cabinet: "Кабинет 1 (Хирургия)",
		procedureTitle: "Контрольный осмотр имплантата Straumann в обл. 36",
		durationMinutes: 30,
		isConfirmed: true,
		isPast: false,
		toothNumber: 36,
	},
	{
		id: "app-past-1",
		dateStr: "28 сентября 2026",
		timeStr: "11:00",
		doctorName: "Д-р Романова Елена Сергеевна",
		doctorRole: "Стоматолог-гигиенист",
		cabinet: "Кабинет 2 (Профилактика)",
		procedureTitle: "Комплексная профгигиена полости рта (AirFlow + УЗ)",
		durationMinutes: 45,
		isConfirmed: true,
		isPast: true,
		costRub: 6500,
		cashbackEarned: 325,
	},
	{
		id: "app-past-2",
		dateStr: "14 августа 2026",
		timeStr: "15:00",
		doctorName: "Д-р Смирнов Алексей Васильевич",
		doctorRole: "Терапевт-эндодонтист",
		cabinet: "Кабинет 3 (Терапия)",
		procedureTitle: "Прицельная RVG-визиография и эндодонтия зуба 26",
		durationMinutes: 90,
		isConfirmed: true,
		isPast: true,
		costRub: 18200,
		cashbackEarned: 910,
		toothNumber: 26,
	},
];

const DEMO_IMAGING_SCANS: PatientImagingScan[] = [
	{
		id: "scan-rvg-16",
		title: "RVG снимок #16",
		scanType: "rvg_2d",
		scanTypeLabel: "Радиовизиография 2D",
		dateStr: "04 октября 2026",
		doctorName: "Д-р Смирнов А.В.",
		radiationDoseMsv: 0.002,
		doctorNotes: "Глубокая кариозная полость жевательно-медиальной поверхности дентина. Периапикальная щель без деструкции.",
		targetTooth: 16,
		diagnosisBadge: "Кариес дентина (K02.1)",
		markerCoords: { x: 54, y: 42 },
	},
	{
		id: "scan-cbct-3d",
		title: "3D КЛКТ сегмента #36",
		scanType: "cbct_3d",
		scanTypeLabel: "3D Томография КЛКТ",
		dateStr: "28 сентября 2026",
		doctorName: "Д-р Воронов А.В.",
		radiationDoseMsv: 0.024,
		doctorNotes: "Установлен имплантат Straumann BLT 4.1x10mm. Толщина кортикальной пластинки 2.2мм, остеоинтеграция стабильна.",
		targetTooth: 36,
		diagnosisBadge: "Контроль имплантации (Z96.5)",
		markerCoords: { x: 48, y: 58 },
	},
	{
		id: "scan-rvg-26",
		title: "RVG снимок #26",
		scanType: "rvg_2d",
		scanTypeLabel: "Радиовизиография 2D",
		dateStr: "14 августа 2026",
		doctorName: "Д-р Смирнов А.В.",
		radiationDoseMsv: 0.002,
		doctorNotes: "3 корневых канала обтурированы гуттаперчей до верхушки апекса. Патологических периапикальных изменений нет.",
		targetTooth: 26,
		diagnosisBadge: "Обтурация каналов (K04.0)",
		markerCoords: { x: 62, y: 48 },
	},
	{
		id: "scan-optg-pano",
		title: "ОПТГ панорама",
		scanType: "optg_pano",
		scanTypeLabel: "Панорамный снимок",
		dateStr: "10 июня 2026",
		doctorName: "Д-р Романова Е.С.",
		radiationDoseMsv: 0.015,
		doctorNotes: "Обзорный снимок обеих челюстей. ВНЧС без выраженной асимметрии, гайморовы пазухи пневматизированы.",
		diagnosisBadge: "Обзорный статус",
	},
];

const DEMO_TOOTH_COMPLAINTS: ToothComplaint[] = [
	{
		toothNumber: 16,
		complaintType: "acute_throbbing",
		symptomLabel: "Острая пульсирующая боль",
		painLevel: 4,
		cito: true,
		notes: "Реакция на горячее и накусывание 2 дня",
	},
];

export const TelegramPatientPortalCabinet: React.FC<TelegramPatientPortalCabinetProps> = memo(({
	organizationId: propOrgId,
	patientId: propPatientId,
	initialTab = "appointments",
	initialTaxSheetOpen = false,
}) => {
	const isDemo = isDemoShowcaseMode();
	const [activeTab, setActiveTab] = useState<TelegramCabinetTab>(initialTab);

	// Семейный профиль
	const [activeFamilyMemberId, setActiveFamilyMemberId] = useState<string>("self");
	const [familyMembers] = useState(() =>
		isDemo ? DEMO_FAMILY_MEMBERS : [{ id: "self", name: "Пациент", relation: "self" }],
	);

	// Финансы & Лояльность
	const [bonusBalance, setBonusBalance] = useState<number>(() => (isDemo ? 2750 : 0));
	const [depositBalance] = useState<number>(() => (isDemo ? 15000 : 0));
	const [totalYearExpense] = useState<number>(() => (isDemo ? 148500 : 0));

	// Записи пациента
	const [appointments, setAppointments] = useState<PatientAppointment[]>(() =>
		isDemo ? DEMO_APPOINTMENTS : [],
	);

	// Фильтр списка записей ("upcoming" | "past")
	const [appointmentFilter, setAppointmentFilter] = useState<"upcoming" | "past">("upcoming");

	// Снимки пациента
	const [imagingList] = useState<PatientImagingScan[]>(() =>
		isDemo ? DEMO_IMAGING_SCANS : [],
	);

	const [selectedScanId, setSelectedScanId] = useState<string>(() =>
		isDemo ? "scan-rvg-16" : "",
	);
	const activeScan = useMemo(
		() => imagingList.find((s) => s.id === selectedScanId) ?? imagingList[0] ?? null,
		[imagingList, selectedScanId],
	);

	// Управление просмотрщиком снимков
	const [zoomLevel, setZoomLevel] = useState<number>(1);
	const [isInverted, setIsInverted] = useState<boolean>(false);
	const [isSharpened, setIsSharpened] = useState<boolean>(false);
	const [showDoctorNotes, setShowDoctorNotes] = useState<boolean>(true);

	// Шторка заявления на налоговый вычет (13% НДФЛ)
	const [isTaxSheetOpen, setIsTaxSheetOpen] = useState<boolean>(initialTaxSheetOpen);
	const [taxYear, setTaxYear] = useState<number>(2025);
	const [payerType, setPayerType] = useState<"self" | "child" | "spouse">("self");
	const [payerInn, setPayerInn] = useState<string>(() => (isDemo ? "772481928301" : ""));
	const [payerFullName, setPayerFullName] = useState<string>(() =>
		isDemo ? "Иванов Александр Сергеевич" : "",
	);
	const [payerPassport, setPayerPassport] = useState<string>(() =>
		isDemo ? "4512 892341" : "",
	);
	const [serviceCode, setServiceCode] = useState<"1" | "2">("1"); // 1 - обычное, 2 - дорогостоящее
	const [isTaxCertGenerated, setIsTaxCertGenerated] = useState<boolean>(false);
	const [taxCopiedNotice, setTaxCopiedNotice] = useState<boolean>(false);

	// Зубные жалобы FDI для вкладки "teeth"
	const [toothComplaints, setToothComplaints] = useState<ToothComplaint[]>(() =>
		isDemo ? DEMO_TOOTH_COMPLAINTS : [],
	);

	// Haptic Feedback для Telegram
	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try {
			window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
		} catch {
			// Игнорируем вне среды Telegram
		}
	}, []);

	// Подтверждение визита в 1 тап
	const handleConfirmAppointment = useCallback((id: string) => {
		triggerHaptic("medium");
		setAppointments((prev) =>
			prev.map((app) => (app.id === id ? { ...app, isConfirmed: true } : app)),
		);
	}, [triggerHaptic]);

	// Фильтрованные записи
	const filteredAppointments = useMemo(
		() => appointments.filter((app) => (appointmentFilter === "upcoming" ? !app.isPast : app.isPast)),
		[appointments, appointmentFilter],
	);

	// Расчет налогового вычета (13% от общей суммы)
	const calculatedDeduction = useMemo(() => Math.round(totalYearExpense * 0.13), [totalYearExpense]);

	// Обработка жалоб на зубы
	const handleSaveToothComplaint = useCallback((complaint: ToothComplaint) => {
		setToothComplaints((prev) => {
			const filtered = prev.filter((c) => c.toothNumber !== complaint.toothNumber);
			return [...filtered, complaint];
		});
	}, []);

	const handleRemoveToothComplaint = useCallback((toothNumber: number) => {
		setToothComplaints((prev) => prev.filter((c) => c.toothNumber !== toothNumber));
	}, []);

	// Поделиться реферальной ссылкой
	const handleShareReferral = useCallback(() => {
		triggerHaptic("medium");
		const link = `https://t.me/DenteClinicBot?start=ref_${propPatientId || "ivanov"}`;
		const shareText = "Дарю сертификат 1 000 ₽ на лечение и чистку в клинике DENTE! Запись онлайн в 1 тап:";
		const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

		if (window.Telegram?.WebApp?.openTelegramLink) {
			window.Telegram.WebApp.openTelegramLink(tgUrl);
		} else {
			window.open(tgUrl, "_blank");
		}
	}, [propPatientId, triggerHaptic]);

	return (
		<div className="tg-app-container tg-cabinet-root">
			{/* Шапка Кабинета (Pocket Clinic Top Bar) */}
			<header className="tg-app-header">
				<div className="tg-app-brand">
					<div className="tg-app-logo">
						<Activity size={20} />
					</div>
					<div>
						<div className="tg-app-title">DENTE Pocket Clinic</div>
						<div className="tg-app-subtitle">
							<ShieldCheck size={12} className="text-teal-400" />
							<span>Кабинет пациента</span>
						</div>
					</div>
				</div>

				{/* Бонусный чип с переходом во вкладку финансов */}
				<button
					type="button"
					className="tg-bonus-chip"
					onClick={() => {
						setActiveTab("finance");
						triggerHaptic("light");
					}}
					title="Ваш бонусный баланс DENTE"
				>
					<Sparkles size={13} />
					<span>{bonusBalance.toLocaleString("ru-RU")} ₽</span>
				</button>
			</header>

			{/* Семейный стрип переключения профилей */}
			<div className="tg-family-strip">
				<Users size={14} className="text-slate-400 ml-1 flex-shrink-0" />
				{familyMembers.map((m) => (
					<button
						key={m.id}
						type="button"
						className={`tg-family-pill ${activeFamilyMemberId === m.id ? "active" : ""}`}
						onClick={() => {
							setActiveFamilyMemberId(m.id);
							triggerHaptic("light");
						}}
					>
						<User size={13} />
						<span>{m.name}</span>
					</button>
				))}
			</div>

			{/* =========================================================================
			    ВКЛАДКА 1: 🦷 ЗУБЫ И СИМПТОМЫ (FDI 32 + 20)
			    ========================================================================= */}
			{activeTab === "teeth" && (
				<main className="tg-tab-content">
					<div className="tg-section-header">
						<div>
							<h2 className="tg-section-title">Зубная формула и жалобы</h2>
							<p className="tg-section-desc">
								Нажмите на зуб для фиксации симптомов перед приёмом врача
							</p>
						</div>
					</div>

					<TelegramInteractiveToothPicker
						selectedComplaints={toothComplaints}
						onSaveComplaint={handleSaveToothComplaint}
						onRemoveComplaint={handleRemoveToothComplaint}
						onProceedToBooking={() => setActiveTab("appointments")}
					/>
				</main>
			)}

			{/* =========================================================================
			    ВКЛАДКА 2: 📅 МОИ ЗАПИСИ (ПРЕДСТОЯЩИЕ И АРХИВ)
			    ========================================================================= */}
			{activeTab === "appointments" && (
				<main className="tg-tab-content">
					{/* Переключатель «Предстоящие» / «Прошедшие» в стиле Apple Segmented Bar */}
					<div className="tg-segmented-control">
						<button
							type="button"
							className={`tg-segment-btn ${appointmentFilter === "upcoming" ? "active" : ""}`}
							onClick={() => {
								setAppointmentFilter("upcoming");
								triggerHaptic("light");
							}}
						>
							<Clock size={14} />
							<span>Предстоящие ({appointments.filter((a) => !a.isPast).length})</span>
						</button>
						<button
							type="button"
							className={`tg-segment-btn ${appointmentFilter === "past" ? "active" : ""}`}
							onClick={() => {
								setAppointmentFilter("past");
								triggerHaptic("light");
							}}
						>
							<CheckCircle2 size={14} />
							<span>Прошедшие ({appointments.filter((a) => a.isPast).length})</span>
						</button>
					</div>

					{/* Список визитов (Grouped Card List) */}
					<div className="tg-card-list">
						{filteredAppointments.length === 0 ? (
							<div className="tg-empty-card">
								<Calendar size={32} className="text-slate-400 mb-2" />
								<div className="text-sm font-bold">Нет запланированных визитов</div>
								<div className="text-xs text-slate-400 mt-1">
									Выберите удобное время для консультации или чистки
								</div>
							</div>
						) : (
							filteredAppointments.map((app) => (
								<div key={app.id} className="tg-grouped-card tg-appointment-card">
									{/* Шапка карточки визита */}
									<div className="tg-appointment-header">
										<div>
											<div className="tg-appointment-datetime">
												<Calendar size={14} className="text-teal-400" />
												<span>{app.dateStr} в {app.timeStr}</span>
											</div>
											<div className="tg-appointment-cabinet">
												{app.cabinet} • {app.durationMinutes} мин
											</div>
										</div>

										{/* Бейдж статуса */}
										{app.isPast ? (
											<span className="tg-status-badge tg-badge-completed">
												Завершён
											</span>
										) : app.isConfirmed ? (
											<span className="tg-status-badge tg-badge-confirmed">
												<Check size={11} />
												<span>Подтверждён</span>
											</span>
										) : (
											<span className="tg-status-badge tg-badge-pending">
												Требует подтверждения
											</span>
										)}
									</div>

									{/* Тело карточки: Врач и Процедура */}
									<div className="tg-appointment-body">
										<div className="tg-appointment-procedure">
											{app.toothNumber && (
												<span className="tg-tooth-chip">Зуб #{app.toothNumber}</span>
											)}
											<span>{app.procedureTitle}</span>
										</div>
										<div className="tg-appointment-doctor">
											<div className="tg-doctor-circle">
												{app.doctorName.replace("Д-р ", "").charAt(0)}
											</div>
											<div>
												<div className="tg-doctor-name">{app.doctorName}</div>
												<div className="tg-doctor-role">{app.doctorRole}</div>
											</div>
										</div>

									</div>

									{/* Футер карточки визита с кнопками в 1 тап */}
									{!app.isPast ? (
										<div className="tg-appointment-actions">
											{!app.isConfirmed ? (
												<button
													type="button"
													className="tg-cta-button tg-confirm-btn"
													onClick={() => handleConfirmAppointment(app.id)}
												>
													<CheckCircle2 size={16} />
													<span>Подтвердить визит в 1 клик</span>
												</button>
											) : (
												<div className="tg-confirmed-note">
													<ShieldCheck size={14} className="text-teal-400" />
													<span>Вы подтвердили визит. Доктор ожидает вас в клинике!</span>
												</div>
											)}

											<div className="tg-appointment-sub-actions">
												<a
													href="tel:+74951234567"
													className="tg-sub-action-btn"
													onClick={() => triggerHaptic("light")}
												>
													<Phone size={14} />
													<span>Позвонить</span>
												</a>
												<a
													href="https://yandex.ru/maps/?text=Москва,+Столярный+пер.,+14"
													target="_blank"
													rel="noopener noreferrer"
													className="tg-sub-action-btn"
													onClick={() => triggerHaptic("light")}
												>
													<MapPin size={14} />
													<span>Маршрут</span>
												</a>
											</div>
										</div>
									) : (
										/* Для архивного визита — финансовая строка и кэшбэк */
										<div className="tg-past-summary">
											<div className="flex justify-between items-center text-xs">
												<span className="text-slate-400">Стоимость лечения:</span>
												<span className="font-bold text-slate-100">
													{app.costRub?.toLocaleString("ru-RU")} ₽
												</span>
											</div>
											{app.cashbackEarned && (
												<div className="flex justify-between items-center text-xs text-amber-400 mt-1">
													<span>Начислено кэшбэка 5%:</span>
													<span className="font-bold">+{app.cashbackEarned} бонусов</span>
												</div>
											)}
										</div>
									)}
								</div>
							))
						)}
					</div>

					{/* Быстрая плашка записи на новый приём */}
					<div className="tg-quick-book-banner">
						<div>
							<div className="text-sm font-bold text-slate-100">Нужен осмотр или чистка?</div>
							<div className="text-xs text-slate-400 mt-0.5">Выберите свободное время к вашему доктору</div>
						</div>
						<button
							type="button"
							className="tg-book-accent-btn"
							onClick={() => {
								setActiveTab("teeth");
								triggerHaptic("medium");
							}}
						>
							<span>+ Записаться</span>
						</button>
					</div>
				</main>
			)}

			{/* =========================================================================
			    ВКЛАДКА 3: 🖼️ СНИМКИ И КТ (RVG 2D, 3D КЛКТ, ОПТГ)
			    ========================================================================= */}
			{activeTab === "imaging" && (
				<main className="tg-tab-content">
					<div className="tg-section-header">
						<div>
							<h2 className="tg-section-title">Цифровая диагностика & КТ</h2>
							<p className="tg-section-desc">
								Рентгенограммы высокого разрешения с заключениями вашего врача
							</p>
						</div>
					</div>

					{/* Горизонтальная карусель выбора снимка или честный EmptyState */}
					{imagingList.length === 0 ? (
						<div className="tg-empty-card">
							<Eye size={32} className="text-slate-400 mb-2" />
							<div className="text-sm font-bold">Снимки отсутствуют</div>
							<div className="text-xs text-slate-400 mt-1">
								После проведения радиовизиографии или КТ врач прикрепит диагностические снимки к вашей карте
							</div>
						</div>
					) : (
						<div className="tg-scans-carousel">
							{imagingList.map((scan) => {
								const isSel = scan.id === selectedScanId;
								return (
									<button
										key={scan.id}
										type="button"
										className={`tg-scan-card-thumb ${isSel ? "active" : ""}`}
										onClick={() => {
											setSelectedScanId(scan.id);
											setZoomLevel(1);
											triggerHaptic("light");
										}}
									>
										<div className="tg-thumb-icon">
											{scan.scanType === "cbct_3d" ? "🧊" : "🦷"}
										</div>
										<div className="tg-thumb-info">
											<div className="tg-thumb-title">{scan.title}</div>
											<div className="tg-thumb-date">{scan.dateStr}</div>
										</div>
										{isSel && <div className="tg-thumb-active-dot" />}
									</button>
								);
							})}
						</div>
					)}

					{/* Интерактивный визиограф / КТ-вьювер на смартфоне */}
					{activeScan && (
					<div className="tg-grouped-card tg-viewer-container">
						{/* Верхний тулбар вьювера: зум, инверсия, резкость */}
						<div className="tg-viewer-toolbar">
							<div className="flex items-center gap-1.5">
								<span className="tg-viewer-badge">{activeScan.scanTypeLabel}</span>
								<span className="text-[11px] text-slate-400">
									Доза: {activeScan.radiationDoseMsv} мЗв
								</span>
							</div>

							<div className="flex items-center gap-1">
								<button
									type="button"
									className={`tg-viewer-tool-btn ${isInverted ? "active" : ""}`}
									onClick={() => {
										setIsInverted((v) => !v);
										triggerHaptic("light");
									}}
									title="Инверсия негатив/позитив"
								>
									<RotateCcw size={15} />
									<span className="text-[10px] font-bold">Инв.</span>
								</button>

								<button
									type="button"
									className={`tg-viewer-tool-btn ${zoomLevel > 1 ? "active" : ""}`}
									onClick={() => {
										setZoomLevel((z) => (z >= 2 ? 1 : z + 0.5));
										triggerHaptic("light");
									}}
									title="Масштабирование"
								>
									{zoomLevel === 1 ? <ZoomIn size={15} /> : <ZoomOut size={15} />}
									<span className="text-[10px] font-bold">{zoomLevel}x</span>
								</button>

								<button
									type="button"
									className={`tg-viewer-tool-btn ${showDoctorNotes ? "active" : ""}`}
									onClick={() => {
										setShowDoctorNotes((v) => !v);
										triggerHaptic("light");
									}}
									title="Показать пометки врача"
								>
									<Eye size={15} />
								</button>
							</div>
						</div>

						{/* Экран снимка с интерактивным масштабированием */}
						<div className="tg-canvas-viewport">
							<div
								className={`tg-scan-display ${isInverted ? "inverted" : ""}`}
								style={{ transform: `scale(${zoomLevel})` }}
							>
								{/* Симуляция рентгенограммы анатомически достоверной структуры */}
								<svg
									viewBox="0 0 360 260"
									className="w-full h-auto tg-radiology-svg"
									xmlns="http://www.w3.org/2000/svg"
								>
									<defs>
										<radialGradient id="boneGlow" cx="50%" cy="50%" r="50%">
											<stop offset="0%" stopColor="#2a384c" />
											<stop offset="70%" stopColor="#141c27" />
											<stop offset="100%" stopColor="#080c12" />
										</radialGradient>
										<linearGradient id="toothGradient" x1="0%" y1="0%" x2="0%" y2="100%">
											<stop offset="0%" stopColor="#dce7f5" />
											<stop offset="50%" stopColor="#9fb4ce" />
											<stop offset="100%" stopColor="#5d728e" />
										</linearGradient>
										<linearGradient id="pulpGradient" x1="0%" y1="0%" x2="0%" y2="100%">
											<stop offset="0%" stopColor="#37475d" />
											<stop offset="100%" stopColor="#1c2533" />
										</linearGradient>
									</defs>

									{/* Фон рентген-детектора */}
									<rect width="360" height="260" fill="url(#boneGlow)" rx="12" />

									{/* Трабекулярная сетка костной ткани */}
									<g opacity="0.35" stroke="#718ba7" strokeWidth="0.5" strokeDasharray="2,3">
										<path d="M 10 40 Q 90 20 180 35 T 350 40" fill="none" />
										<path d="M 10 100 Q 90 85 180 110 T 350 95" fill="none" />
										<path d="M 10 180 Q 90 170 180 190 T 350 180" fill="none" />
										<path d="M 10 230 Q 90 220 180 240 T 350 230" fill="none" />
									</g>

									{/* Анатомический контур зуба и корней */}
									{activeScan.scanType === "cbct_3d" ? (
										/* Срез 3D имплантата */
										<g transform="translate(140, 50)">
											{/* Имплантат Straumann */}
											<rect x="25" y="40" width="30" height="85" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
											{/* Резьба имплантата */}
											<line x1="20" y1="55" x2="60" y2="55" stroke="#94a3b8" strokeWidth="2" />
											<line x1="20" y1="70" x2="60" y2="70" stroke="#94a3b8" strokeWidth="2" />
											<line x1="20" y1="85" x2="60" y2="85" stroke="#94a3b8" strokeWidth="2" />
											<line x1="20" y1="100" x2="60" y2="100" stroke="#94a3b8" strokeWidth="2" />
											{/* Абатмент и формирователь десны */}
											<path d="M 28 40 L 32 15 L 48 15 L 52 40 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
											<text x="40" y="145" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
												Straumann 4.1×10mm
											</text>
										</g>
									) : (
										/* RVG коронка и корневые каналы */
										<g transform="translate(130, 30)">
											{/* Коронковая часть */}
											<path
												d="M 15 45 Q 50 20 85 45 Q 95 90 80 120 L 20 120 Q 5 90 15 45 Z"
												fill="url(#toothGradient)"
												stroke="#cbd5e1"
												strokeWidth="1.5"
											/>
											{/* Корни (медиальный и дистальный) */}
											<path
												d="M 20 120 Q 15 170 30 205 Q 38 205 42 170 L 48 120 Z"
												fill="url(#toothGradient)"
												stroke="#94a3b8"
												strokeWidth="1.2"
											/>
											<path
												d="M 52 120 L 58 170 Q 62 205 70 205 Q 85 170 80 120 Z"
												fill="url(#toothGradient)"
												stroke="#94a3b8"
												strokeWidth="1.2"
											/>
											{/* Пульповая камера и каналы */}
											<path
												d="M 35 60 Q 50 50 65 60 Q 62 90 50 100 Q 38 90 35 60 Z"
												fill="url(#pulpGradient)"
											/>
											<path d="M 40 100 L 32 195" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
											<path d="M 60 100 L 68 195" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

											{/* Дефект: кариозное затемнение (для зуба 16) */}
											{activeScan.id === "scan-rvg-16" && (
												<path
													d="M 18 52 Q 28 62 25 75 Q 16 70 18 52 Z"
													fill="#0a0f16"
													opacity="0.85"
												/>
											)}
										</g>
									)}

									{/* Диагностическая метка врача */}
									{showDoctorNotes && activeScan.markerCoords && (
										<g transform={`translate(${activeScan.markerCoords.x * 3.6}, ${activeScan.markerCoords.y * 2.6})`}>
											<circle cx="0" cy="0" r="14" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" />
											<circle cx="0" cy="0" r="3" fill="#ef4444" />
											<rect x="18" y="-12" width="115" height="22" rx="6" fill="rgba(15, 23, 42, 0.9)" stroke="#ef4444" strokeWidth="1" />
											<text x="25" y="3" fill="#fecaca" fontSize="9" fontWeight="bold">
												{activeScan.diagnosisBadge}
											</text>
										</g>
									)}
								</svg>
							</div>
						</div>

						{/* Заключение доктора под снимком */}
						<div className="tg-viewer-footer">
							<div className="flex items-center justify-between mb-1.5">
								<div className="tg-doctor-name flex items-center gap-1.5">
									<FileText size={13} className="text-teal-400" />
									<span>Заключение: {activeScan.doctorName}</span>
								</div>
								<span className="text-[11px] font-bold text-teal-400">
									{activeScan.diagnosisBadge}
								</span>
							</div>

							<p className="tg-doctor-notes-box">
								{activeScan.doctorNotes}
							</p>

							<div className="mt-3 flex gap-2">
								<button
									type="button"
									className="flex-1 py-2.5 px-3 rounded-xl bg-teal-600/15 border border-teal-500/30 text-teal-600 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
									onClick={() => triggerHaptic("light")}
								>
									<Download size={14} />
									<span>Скачать снимок (DICOM/PNG)</span>
								</button>
								<button
									type="button"
									className="py-2.5 px-3 rounded-xl bg-teal-600/15 border border-teal-500/30 text-teal-600 dark:text-teal-300 text-xs font-bold flex items-center justify-center transition-all"
									onClick={handleShareReferral}
									title="Поделиться"
								>
									<Share2 size={14} />
								</button>
							</div>
						</div>

					</div>
					)}
				</main>
			)}

			{/* =========================================================================
			    ВКЛАДКА 4: 🧾 СПРАВКА ДЛЯ НАЛОГОВОЙ (13% НДФЛ)
			    ========================================================================= */}
			{activeTab === "tax" && (
				<main className="tg-tab-content">
					<div className="tg-section-header">
						<div>
							<h2 className="tg-section-title">Налоговый вычет 13% (НДФЛ)</h2>
							<p className="tg-section-desc">
								Верните до 19 500 ₽ за стоматологическое лечение по форме ФНС КНД 1151156
							</p>
						</div>
					</div>

					{/* Главная карточка расчета вычета */}
					<div className="tg-tax-hero-card">
						<div className="flex items-center justify-between mb-3">
							<span className="tg-tax-period-tag">Налоговый период: {taxYear} год</span>
							<span className="tg-fns-law-pill">Приказ ФНС № ЕА-7-11/824@</span>
						</div>

						<div className="text-xs text-slate-400">Оплачено за лечение за {taxYear} год:</div>
						<div className="text-2xl font-black text-slate-100 mt-0.5">
							{totalYearExpense.toLocaleString("ru-RU")} ₽
						</div>

						<div className="tg-deduction-result-box mt-3">
							<div className="text-xs text-emerald-400 font-bold">Сумма к возврату на карту (13%):</div>
							<div className="text-3xl font-black text-emerald-400 mt-0.5">
								+{calculatedDeduction.toLocaleString("ru-RU")} ₽
							</div>
							<div className="text-[11px] text-slate-400 mt-1">
								По ст. 219 НК РФ выплата поступает напрямую на ваш расчетный счет в банке
							</div>
						</div>

						<button
							type="button"
							className="tg-cta-button mt-4"
							onClick={() => {
								setIsTaxSheetOpen(true);
								triggerHaptic("medium");
							}}
						>
							<FileCheck2 size={18} />
							<span>Оформить справку КНД 1151156 в 1 тап</span>
						</button>
					</div>

					{/* Информационный гид в 3 шага */}
					<div className="tg-grouped-card p-4">
						<div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
							Как получить возврат 13% за 3 простых шага:
						</div>

						<div className="space-y-3">
							<div className="flex items-start gap-3">
								<div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
									1
								</div>
								<div>
									<div className="text-xs font-bold text-slate-200">Сформируйте справку здесь</div>
									<div className="text-[11px] text-slate-400">
										Мы мгновенно подставим все чеки, лицензию клиники и электронную подпись главврача.
									</div>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
									2
								</div>
								<div>
									<div className="text-xs font-bold text-slate-200">Отправьте в Личный кабинет ФНС</div>
									<div className="text-[11px] text-slate-400">
										Зайдите на nalog.gov.ru или приложение «Налоги ФЛ» и прикрепите готовый файл.
									</div>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
									3
								</div>
								<div>
									<div className="text-xs font-bold text-slate-200">Получите деньги на карту</div>
									<div className="text-[11px] text-slate-400">
										ФНС проверит заявление в ускоренном порядке (до 30 дней) и переведет средства.
									</div>
								</div>
							</div>
						</div>
					</div>
				</main>
			)}

			{/* =========================================================================
			    ВКЛАДКА 5: 💳 ФИНАНСЫ, КЭШБЭК И РЕФЕРАЛЫ
			    ========================================================================= */}
			{activeTab === "finance" && (
				<main className="tg-tab-content">
					<div className="tg-section-header">
						<div>
							<h2 className="tg-section-title">Финансы & Бонусы</h2>
							<p className="tg-section-desc">
								Баланс клиники, кэшбэк и программа «Приведи друга»
							</p>
						</div>
					</div>

					{/* Карточка баланса */}
					<div className="tg-finance-balance-card">
						<div className="flex justify-between items-center mb-2">
							<span className="text-xs text-slate-400">Бонусный счет DENTE</span>
							<span className="text-xs font-bold text-teal-400">1 бонус = 1 рубль</span>
						</div>
						<div className="text-3xl font-black text-slate-100">
							{bonusBalance.toLocaleString("ru-RU")} ₽
						</div>

						<div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-between items-center text-xs">
							<span className="text-slate-400">Депозит клиники (аванс):</span>
							<span className="font-bold text-slate-200">{depositBalance.toLocaleString("ru-RU")} ₽</span>
						</div>
					</div>

					{/* Карточка акции «Подари другу 1 000 ₽» */}
					<div className="tg-referral-card">
						<div className="flex items-center gap-2 mb-2">
							<div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
								🎁
							</div>
							<div>
								<div className="text-sm font-bold text-slate-100">Подари другу 1 000 ₽</div>
								<div className="text-xs text-slate-400">И получи +500 бонусов себе на счет</div>
							</div>
						</div>
						<p className="text-xs text-slate-300 leading-relaxed mb-3">
							Ваш друг получит персональный сертификат на 1 000 ₽ на первый визит или комплексную чистку, а вы — 500 бонусов DENTE сразу после его записи.
						</p>
						<button
							type="button"
							className="tg-cta-button bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
							onClick={handleShareReferral}
						>
							<Share2 size={16} />
							<span>Отправить приглашение другу в Telegram</span>
						</button>
					</div>

					{/* Детализация начислений и списаний */}
					<div className="tg-grouped-card p-4">
						<div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
							История начислений и операций:
						</div>

						{isDemo ? (
							<div className="space-y-3">
								<div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
									<div>
										<div className="font-bold text-slate-200">+1 250 ₽ — Кэшбэк 5% за профгигиену</div>
										<div className="text-[11px] text-slate-400">28 сентября 2026</div>
									</div>
									<span className="text-xs font-bold text-emerald-400">+1 250</span>
								</div>

								<div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
									<div>
										<div className="font-bold text-slate-200">+500 ₽ — Бонус за друга (Михаил)</div>
										<div className="text-[11px] text-slate-400">14 сентября 2026</div>
									</div>
									<span className="text-xs font-bold text-emerald-400">+500</span>
								</div>

								<div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
									<div>
										<div className="font-bold text-slate-200">+1 000 ₽ — Приветственный бонус</div>
										<div className="text-[11px] text-slate-400">01 сентября 2026</div>
									</div>
									<span className="text-xs font-bold text-emerald-400">+1 000</span>
								</div>
							</div>
						) : (
							<div className="text-xs text-slate-400 py-3 text-center">
								Операций по программе лояльности пока не зарегистрировано
							</div>
						)}
					</div>
				</main>
			)}

			{/* =========================================================================
			    НАТИВНАЯ ШТОРКА СПРАВКИ ДЛЯ НАЛОГОВОЙ 13% НДФЛ (BOTTOM SHEET ПО APPLE HIG)
			    ========================================================================= */}
			{isTaxSheetOpen && (
				<div
					className="tg-sheet-backdrop"
					onClick={() => {
						setIsTaxSheetOpen(false);
						triggerHaptic("light");
					}}
				>
					<div
						className="tg-bottom-sheet tg-tax-sheet"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Тактильный хэндл для свайпа */}
						<div className="tg-sheet-handle" />

						{/* Шапка шторки */}
						<div className="tg-sheet-header">
							<div>
								<div className="tg-sheet-title">
									<FileCheck2 size={18} className="text-teal-400" />
									<span>Справка для налоговой (КНД 1151156)</span>
								</div>
								<div className="tg-sheet-subtitle">
									Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@
								</div>
							</div>
							<button
								type="button"
								className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center"
								onClick={() => {
									setIsTaxSheetOpen(false);
									triggerHaptic("light");
								}}
							>
								<X size={16} />
							</button>
						</div>

						{/* Тело шторки */}
						<div className="tg-sheet-body space-y-4">
							{!isTaxCertGenerated ? (
								<>
									{/* Выбор налогового периода */}
									<div>
										<label className="tg-field-label">
											Налоговый период (год оплаты):
										</label>
										<div className="flex gap-2">
											{[2025, 2024, 2023].map((y) => (
												<button
													key={y}
													type="button"
													className={`tg-chip-selector-btn ${taxYear === y ? "active" : ""}`}
													onClick={() => {
														setTaxYear(y);
														triggerHaptic("light");
													}}
												>
													{y} год
												</button>
											))}
										</div>
									</div>

									{/* Кто выступает налогоплательщиком */}
									<div>
										<label className="tg-field-label">
											Кто выступает налогоплательщиком:
										</label>
										<div className="flex gap-2">
											{[
												{ id: "self", label: "За себя" },
												{ id: "child", label: "За ребёнка" },
												{ id: "spouse", label: "За супруга" },
											].map((opt) => (
												<button
													key={opt.id}
													type="button"
													className={`tg-chip-selector-btn ${payerType === opt.id ? "active" : ""}`}
													onClick={() => {
														setPayerType(opt.id as any);
														triggerHaptic("light");
													}}
												>
													{opt.label}
												</button>
											))}
										</div>
									</div>

									{/* Поля реквизитов налогоплательщика */}
									<div className="space-y-2.5 bg-slate-100 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
										<div>
											<label className="tg-field-label">
												ФИО налогоплательщика:
											</label>
											<input
												type="text"
												value={payerFullName}
												onChange={(e) => setPayerFullName(e.target.value)}
												className="tg-field-input"
											/>
										</div>

										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="tg-field-label">
													ИНН (12 цифр):
												</label>
												<input
													type="text"
													value={payerInn}
													maxLength={12}
													onChange={(e) => setPayerInn(e.target.value.replace(/\D/g, ""))}
													className="tg-field-input font-mono font-bold"
												/>
											</div>
											<div>
												<label className="tg-field-label">
													Паспорт РФ:
												</label>
												<input
													type="text"
													value={payerPassport}
													onChange={(e) => setPayerPassport(e.target.value)}
													className="tg-field-input"
												/>
											</div>
										</div>
									</div>

									{/* Код услуги ФНС */}
									<div>
										<label className="tg-field-label">
											Код медицинской услуги:
										</label>
										<div className="space-y-2">
											<label
												className={`tg-service-radio-card ${serviceCode === "1" ? "active" : ""}`}
											>
												<input
													type="radio"
													name="serviceCode"
													checked={serviceCode === "1"}
													onChange={() => setServiceCode("1")}
													className="mt-0.5 accent-teal-500"
												/>
												<div>
													<div className="tg-radio-title">Код 1 — Медицинские услуги</div>
													<div className="tg-radio-desc">
														Терапия, эндодонтия, гигиена (лимит 150 000 ₽)
													</div>
												</div>
											</label>

											<label
												className={`tg-service-radio-card ${serviceCode === "2" ? "active" : ""}`}
											>
												<input
													type="radio"
													name="serviceCode"
													checked={serviceCode === "2"}
													onChange={() => setServiceCode("2")}
													className="mt-0.5 accent-teal-500"
												/>
												<div>
													<div className="tg-radio-title">Код 2 — Дорогостоящее лечение</div>
													<div className="tg-radio-desc">
														Дентальная имплантация, костная пластика (вычет БЕЗ лимита!)
													</div>
												</div>
											</label>
										</div>
									</div>

									{/* Сводка и итоговая кнопка */}
									<div className="tg-deduction-summary-box">
										<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
											Расчетная сумма вычета:
										</span>
										<span className="font-bold text-teal-600 dark:text-teal-300 text-sm">
											+{calculatedDeduction.toLocaleString("ru-RU")} ₽
										</span>
									</div>

									<button
										type="button"
										className="tg-cta-button"
										onClick={() => {
											setIsTaxCertGenerated(true);
											triggerHaptic("heavy");
										}}
									>
										<CheckCircle2 size={18} />
										<span>Сформировать справку КНД 1151156</span>
									</button>
								</>
							) : (
								/* Состояние готовой справки с печатью и QR-кодом */
								<div className="space-y-4">
									<div className="tg-tax-cert-preview">
										<div className="tg-cert-stamp-badge">
											<ShieldCheck size={16} className="text-emerald-500" />
											<span>Подписано УКЭП клиники</span>
										</div>

										<div className="text-center my-2">
											<div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
												ФОРМА ПО КНД 1151156
											</div>
											<div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
												СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ
											</div>
											<div className="text-[11px] text-slate-500 dark:text-slate-400">
												№ ФНС-2026/043-9821 от {new Date().toLocaleDateString("ru-RU")}
											</div>
										</div>

										<div className="tg-cert-details-card space-y-1.5 my-3">
											<div className="flex justify-between">
												<span className="text-slate-500 dark:text-slate-400">Клиника:</span>
												<span className="font-bold text-slate-900 dark:text-slate-200">ООО «Стоматология ДЕНТЕ»</span>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-500 dark:text-slate-400">ИНН / КПП:</span>
												<span className="font-mono text-slate-900 dark:text-slate-200">7701234567 / 770101001</span>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-500 dark:text-slate-400">Лицензия:</span>
												<span className="text-slate-900 dark:text-slate-200">ЛО41-01137-77/00368142</span>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-500 dark:text-slate-400">Налогоплательщик:</span>
												<span className="font-bold text-slate-900 dark:text-slate-200">{payerFullName}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-500 dark:text-slate-400">ИНН физлица:</span>
												<span className="font-mono text-teal-600 dark:text-teal-300 font-bold">{payerInn}</span>
											</div>
											<div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
												<span className="text-slate-700 dark:text-slate-300 font-bold">Сумма расходов:</span>
												<span className="font-bold text-slate-900 dark:text-slate-100">
													{totalYearExpense.toLocaleString("ru-RU")} ₽
												</span>
											</div>
										</div>

										{/* QR-код для Личного кабинета налогоплательщика */}
										<div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
											<div className="w-14 h-14 bg-white rounded-lg p-1 flex items-center justify-center flex-shrink-0 border border-slate-200">
												<QrCode size={48} className="text-slate-950" />
											</div>
											<div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
												<span className="font-bold text-teal-600 dark:text-teal-400 block mb-0.5">
													QR-код для быстрой загрузки:
												</span>
												Отсканируйте камерой в приложении «Налоги ФЛ» для мгновенной предзаполненной декларации.
											</div>
										</div>
									</div>

									{/* Кнопки скачивания и отправки */}
									<div className="space-y-2">
										<button
											type="button"
											className="tg-cta-button"
											onClick={() => {
												triggerHaptic("medium");
												setTaxCopiedNotice(true);
												setTimeout(() => setTaxCopiedNotice(false), 3000);
											}}
										>
											<Download size={18} />
											<span>Скачать справку (PDF с печатью)</span>
										</button>

										<button
											type="button"
											className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700"
											onClick={() => {
												setIsTaxCertGenerated(false);
												triggerHaptic("light");
											}}
										>
											<RefreshCw size={14} />
											<span>Изменить реквизиты или год</span>
										</button>
									</div>

									{taxCopiedNotice && (
										<div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold text-center">
											✓ Справка КНД 1151156 сформирована и готова к отправке в ФНС!
										</div>
									)}
								</div>
							)}
						</div>

					</div>
				</div>
			)}

			{/* =========================================================================
			    НАВИГАЦИОННЫЙ ТАББАР (FIXED BOTTOM NAV — 5 НАИВНЫХ ТАБОВ APPLE HIG)
			    ========================================================================= */}
			<nav className="tg-bottom-nav">
				{/* ТАБ 1: 🦷 Зубы */}
				<button
					type="button"
					className={`tg-nav-btn ${activeTab === "teeth" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("teeth");
						triggerHaptic("light");
					}}
				>
					<Zap size={18} />
					<span>Зубы</span>
					{toothComplaints.length > 0 && (
						<span className="tg-nav-badge">{toothComplaints.length}</span>
					)}
				</button>

				{/* ТАБ 2: 📅 Записи */}
				<button
					type="button"
					className={`tg-nav-btn ${activeTab === "appointments" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("appointments");
						triggerHaptic("light");
					}}
				>
					<Calendar size={18} />
					<span>Записи</span>
				</button>

				{/* ТАБ 3: 🖼️ Снимки и КТ */}
				<button
					type="button"
					className={`tg-nav-btn ${activeTab === "imaging" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("imaging");
						triggerHaptic("light");
					}}
				>
					<Eye size={18} />
					<span>Снимки</span>
				</button>

				{/* ТАБ 4: 🧾 Налог 13% */}
				<button
					type="button"
					className={`tg-nav-btn ${activeTab === "tax" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("tax");
						triggerHaptic("light");
					}}
				>
					<FileText size={18} />
					<span>Налог 13%</span>
				</button>

				{/* ТАБ 5: 💳 Финансы */}
				<button
					type="button"
					className={`tg-nav-btn ${activeTab === "finance" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("finance");
						triggerHaptic("light");
					}}
				>
					<Wallet size={18} />
					<span>Финансы</span>
				</button>
			</nav>
		</div>
	);
});

TelegramPatientPortalCabinet.displayName = "TelegramPatientPortalCabinet";
