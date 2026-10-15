import { useCallback, useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type { ToothComplaint } from "../TelegramInteractiveToothPicker";
import {
	DEMO_APPOINTMENTS,
	DEMO_FAMILY_MEMBERS,
	DEMO_IMAGING_SCANS,
	DEMO_TOOTH_COMPLAINTS,
	type FamilyMember,
	type PatientAppointment,
	type PatientImagingScan,
	type TelegramCabinetTab,
} from "./types";

export interface UseTelegramPortalCabinetOptions {
	readonly organizationId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly initialTab?: TelegramCabinetTab;
	readonly initialTaxSheetOpen?: boolean;
}

export function useTelegramPortalCabinet(options: UseTelegramPortalCabinetOptions = {}) {
	const {
		organizationId: propOrganizationId,
		patientId: propPatientId,
		initialTab = "appointments",
		initialTaxSheetOpen = false,
	} = options;

	const isDemo = isDemoShowcaseMode();
	const [activeTab, setActiveTab] = useState<TelegramCabinetTab>(initialTab);

	// Семейный профиль
	const [activeFamilyMemberId, setActiveFamilyMemberId] = useState<string>("self");
	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() =>
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

	// Гидратация живых данных из базы данных через API WebApp (/api/telegram/webapp/session)
	useEffect(() => {
		let isMounted = true;
		const initData = window.Telegram?.WebApp?.initData;
		const effectiveOrgId = propOrganizationId || (isDemo ? "demo-clinic-org" : "");
		const effectivePatientId = propPatientId || (isDemo ? "demo-patient-id" : "");

		// Если нет параметров организации/пациента и нет initData в Telegram WebApp — ничего не запрашиваем
		if (!initData && !effectiveOrgId) return;

		const fetchSession = async () => {
			try {
				const res = await fetch("/api/telegram/webapp/session", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						initData: initData || undefined,
						organizationId: effectiveOrgId || "demo-clinic-org",
						patientId: effectivePatientId || undefined,
					}),
				});

				if (!res.ok) return;
				const data = await res.json();
				if (!isMounted || !data) return;

				if (data.patient?.bonusBalanceRub !== undefined) {
					setBonusBalance(data.patient.bonusBalanceRub);
				}
				if (data.patient?.fullName) {
					setPayerFullName((prev) => prev || data.patient.fullName);
				}

				const combinedAppointments: PatientAppointment[] = [];

				if (Array.isArray(data.upcomingAppointments)) {
					for (const app of data.upcomingAppointments) {
						const dt = app.startTime ? new Date(app.startTime) : null;
						const dateStr =
							dt && !Number.isNaN(dt.getTime())
								? dt.toLocaleDateString("ru-RU", {
										weekday: "long",
										day: "numeric",
										month: "long",
										year: "numeric",
									})
								: app.startTime
									? String(app.startTime).split("T")[0] || ""
									: "";
						const timeStr =
							dt && !Number.isNaN(dt.getTime())
								? dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
								: app.startTime
									? String(app.startTime).split("T")[1]?.slice(0, 5) || "10:00"
									: "10:00";

						combinedAppointments.push({
							id: String(app.id),
							dateStr,
							timeStr,
							doctorName: app.doctorName || "Врач-стоматолог",
							doctorRole: app.doctorSpecialty || "Стоматолог-терапевт",
							cabinet: "Кабинет 1",
							procedureTitle: app.notes || "Консультация и осмотр полости рта",
							durationMinutes: 60,
							isConfirmed: app.status === "confirmed",
							isPast: false,
						});
					}
				}

				if (Array.isArray(data.pastVisits)) {
					for (const visit of data.pastVisits) {
						const dt = visit.startTime ? new Date(visit.startTime) : null;
						const dateStr =
							dt && !Number.isNaN(dt.getTime())
								? dt.toLocaleDateString("ru-RU", {
										day: "numeric",
										month: "long",
										year: "numeric",
									})
								: visit.startTime
									? String(visit.startTime).split("T")[0] || ""
									: "";
						const timeStr =
							dt && !Number.isNaN(dt.getTime())
								? dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
								: "12:00";

						combinedAppointments.push({
							id: String(visit.id),
							dateStr,
							timeStr,
							doctorName: visit.doctorName || "Лечащий врач",
							doctorRole: visit.doctorSpecialty || "Врач-стоматолог",
							cabinet: "Кабинет 1",
							procedureTitle: visit.diagnosis || "Стоматологический приём",
							durationMinutes: 60,
							isConfirmed: true,
							isPast: true,
						});
					}
				}

				if (combinedAppointments.length > 0) {
					setAppointments(combinedAppointments);
				}

				if (data.family?.members && Array.isArray(data.family.members) && data.family.members.length > 0) {
					const mappedFamily: FamilyMember[] = data.family.members.map((m: any) => ({
						id: String(m.patientId || m.id || "self"),
						name: String(m.fullName || "Член семьи"),
						relation: String(m.relation || "self"),
					}));
					setFamilyMembers(mappedFamily);
				}
			} catch {
				// В оффлайне или при ошибке сети сохраняются клинические дефолты (Zero Dead-Ends)
			}
		};

		fetchSession();
		return () => {
			isMounted = false;
		};
	}, [propOrganizationId, propPatientId, isDemo]);

	// Подтверждение визита в 1 тап
	const handleConfirmAppointment = useCallback(async (id: string) => {
		triggerHaptic("medium");
		setAppointments((prev) =>
			prev.map((app) => (app.id === id ? { ...app, isConfirmed: true } : app)),
		);

		try {
			const effectiveOrgId = propOrganizationId || (isDemo ? "demo-clinic-org" : "");
			if (effectiveOrgId) {
				await fetch("/api/telegram/webapp/family/confirm", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						organizationId: effectiveOrgId,
						parentPatientId: propPatientId || id,
						appointmentId: id,
					}),
				}).catch(() => {});
			}
		} catch {
			// Оптимистичное обновление UI уже произошло
		}
	}, [propOrganizationId, propPatientId, isDemo, triggerHaptic]);

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

	const handleAddBookedAppointment = useCallback((newAppt: PatientAppointment) => {
		setAppointments((prev) => [newAppt, ...prev]);
		setAppointmentFilter("upcoming");
	}, []);

	const handleDownloadTaxCert = useCallback(() => {
		triggerHaptic("medium");
		setTaxCopiedNotice(true);
		setTimeout(() => setTaxCopiedNotice(false), 3000);
	}, [triggerHaptic]);

	return {
		isDemo,
		organizationId: propOrganizationId,
		patientId: propPatientId,
		activeTab,
		setActiveTab,
		activeFamilyMemberId,
		setActiveFamilyMemberId,
		familyMembers,
		bonusBalance,
		setBonusBalance,
		depositBalance,
		totalYearExpense,
		appointments,
		setAppointments,
		appointmentFilter,
		setAppointmentFilter,
		handleConfirmAppointment,
		handleAddBookedAppointment,
		imagingList,
		selectedScanId,
		setSelectedScanId,
		zoomLevel,
		setZoomLevel,
		isInverted,
		setIsInverted,
		isSharpened,
		setIsSharpened,
		showDoctorNotes,
		setShowDoctorNotes,
		isTaxSheetOpen,
		setIsTaxSheetOpen,
		taxYear,
		setTaxYear,
		payerType,
		setPayerType,
		payerInn,
		setPayerInn,
		payerFullName,
		setPayerFullName,
		payerPassport,
		setPayerPassport,
		serviceCode,
		setServiceCode,
		isTaxCertGenerated,
		setIsTaxCertGenerated,
		taxCopiedNotice,
		toothComplaints,
		handleSaveToothComplaint,
		handleRemoveToothComplaint,
		calculatedDeduction,
		triggerHaptic,
		handleShareReferral,
		handleDownloadTaxCert,
	};
}
