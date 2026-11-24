import { useCallback, useEffect, useMemo, useState } from "react";
import {
	calculatePercentDiscountKopecks,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type { ToothComplaint } from "../TelegramInteractiveToothPicker";
import { downloadPatientTaxCertificate1151156 } from "../../patientCabinet/documents/documentsTaxCertificate";
import type { PatientPersonalCabinetData } from "../../patientCabinet/patientCabinetEngine";
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

interface RawApiFamilyMember {
	readonly patientId?: string | undefined;
	readonly id?: string | undefined;
	readonly fullName?: string | undefined;
	readonly relation?: string | undefined;
}

export interface UseTelegramPortalCabinetOptions {
	readonly organizationId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly initialTab?: TelegramCabinetTab;
	readonly initialTaxSheetOpen?: boolean;
	readonly initialInvoices?: PatientPersonalCabinetData["invoices"] | undefined;
	readonly invoices?: PatientPersonalCabinetData["invoices"] | undefined;
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
	const [depositBalance, setDepositBalance] = useState<number>(() => (isDemo ? 15000 : 0));
	const [totalYearExpense, setTotalYearExpense] = useState<number>(() => (isDemo ? 148500 : 0));
	const [sessionToken, setSessionToken] = useState<string | null>(null);
	const [invoices, setInvoices] = useState<PatientPersonalCabinetData["invoices"]>(() => {
		if (options.invoices?.length) return options.invoices;
		if (options.initialInvoices?.length) return options.initialInvoices;
		return [];
	});

	// Реквизиты клиники (динамические)
	const [clinicName, setClinicName] = useState<string>(() => (isDemo ? "Стоматология ДЕНТЕ" : "Стоматологическая клиника"));
	const [clinicInn, setClinicInn] = useState<string>(() => (isDemo ? "7701234567" : ""));
	const [clinicKpp, setClinicKpp] = useState<string>(() => (isDemo ? "770101001" : ""));
	const [clinicLicense, setClinicLicense] = useState<string>(() => (isDemo ? "ЛО41-01137-77/00368142" : ""));

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

				if (data.token) {
					setSessionToken(data.token);
					try {
						localStorage.setItem("dente_portal_token", data.token);
					} catch {
						// Игнорируем недоступность хранилища в приватном режиме
					}

					// Честная гидратация счетов пациента из /api/portal/profile
					void fetch("/api/portal/profile", {
						headers: { Authorization: `Bearer ${data.token}` },
					})
						.then((r) => (r.ok ? r.json() : null))
						.then((profileData) => {
							if (isMounted && profileData?.invoices && Array.isArray(profileData.invoices) && profileData.invoices.length > 0) {
								setInvoices(profileData.invoices);
							}
						})
						.catch(() => {});
				}
				if (Array.isArray(data.invoices) && data.invoices.length > 0) {
					setInvoices(data.invoices);
				}
				if (data.patient?.bonusBalanceRub !== undefined) {
					setBonusBalance(data.patient.bonusBalanceRub);
				}
				if (data.patient?.depositBalanceRub !== undefined) {
					setDepositBalance(data.patient.depositBalanceRub);
				}
				if (data.patient?.totalYearExpenseRub !== undefined) {
					setTotalYearExpense(data.patient.totalYearExpenseRub);
				}
				if (data.patient?.fullName) {
					setPayerFullName((prev) => prev || data.patient.fullName);
				}
				if (data.clinic) {
					if (data.clinic.name) setClinicName(data.clinic.name);
					if (data.clinic.inn) setClinicInn(data.clinic.inn);
					if (data.clinic.kpp) setClinicKpp(data.clinic.kpp);
					if (data.clinic.license) setClinicLicense(data.clinic.license);
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
					const mappedFamily: FamilyMember[] = data.family.members.map((m: RawApiFamilyMember) => ({
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

	// Ориентировочный расчет социального налогового вычета 13% НДФЛ (ст. 219 НК РФ):
	// Код 01 лимитирован (150 000 ₽ с 2024 г., 120 000 ₽ ранее), Код 02 без лимита
	const calculatedDeduction = useMemo(() => {
		const totalRub = Math.max(0, Math.round(totalYearExpense));
		const limitRub = taxYear >= 2024 ? 150000 : 120000;
		const eligibleRub = serviceCode === "2" ? totalRub : Math.min(totalRub, limitRub);
		// Точный расчет доли 13% через канонический модуль @dental/shared без сырого float:
		const eligibleKopecks = rublesToKopecks(eligibleRub);
		const deductionKopecks = calculatePercentDiscountKopecks(eligibleKopecks, 13);
		return Math.round(kopecksToRubles(deductionKopecks));
	}, [totalYearExpense, taxYear, serviceCode]);

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
		const shareText = "Дарю сертификат 1 000 ₽ на лечение и чистку в клинике DENTE! Запись на приём:";
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

	const handleDownloadTaxCert = useCallback(async () => {
		triggerHaptic("medium");
		setTaxCopiedNotice(true);

		const cabinetData: PatientPersonalCabinetData = {
			patientId: propPatientId || "telegram-patient",
			fullName: payerFullName.trim() || "Пациент",
			phone: "",
			inn: payerInn.trim() || undefined,
			birthDate: undefined,
			cardNumber: `TG-${(propPatientId || "PATIENT").slice(0, 6).toUpperCase()}`,
			curatingDoctor: appointments[0]?.doctorName || "Лечащий врач",
			loyaltyBonusBalance: bonusBalance,
			loyaltyTierRu: "Базовый",
			appointments: appointments.map((app) => ({
				id: app.id,
				dateIso: app.dateStr || `${taxYear}-01-01T00:00:00.000Z`,
				dateRu: app.dateStr,
				timeRu: app.timeStr,
				doctorId: "",
				doctorName: app.doctorName,
				doctorSpecialtyRu: app.doctorRole,
				roomNumber: app.cabinet || "",
				clinicName: clinicName || "Стоматологическая клиника",
				clinicAddressRu: "",
				titleRu: app.procedureTitle || "Стоматологический приём",
				status: app.isPast ? ("completed" as const) : ("scheduled" as const),
				priceRub: app.costRub,
				reminderSent: false,
			})),
			treatmentPlans: [],
			invoices: invoices || [],
			warranties: [],
			passport: payerPassport.trim() || undefined,
		};

		try {
			await downloadPatientTaxCertificate1151156(cabinetData, taxYear, sessionToken);
			setIsTaxCertGenerated(true);
		} catch (err: unknown) {
			console.error("Failed to download tax certificate:", err);
		} finally {
			setTimeout(() => setTaxCopiedNotice(false), 3000);
		}
	}, [
		triggerHaptic,
		propPatientId,
		payerFullName,
		payerInn,
		bonusBalance,
		appointments,
		taxYear,
		sessionToken,
		clinicName,
		invoices,
		payerPassport,
	]);

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
		setDepositBalance,
		totalYearExpense,
		setTotalYearExpense,
		sessionToken,
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
		clinicName,
		clinicInn,
		clinicKpp,
		clinicLicense,
		certificateNumber: `СПР-${taxYear}/${propPatientId ? propPatientId.slice(0, 6).toUpperCase() : (payerInn ? payerInn.slice(-4) : "001")}`,
		issueDate: new Date().toLocaleDateString("ru-RU"),
		invoices,
		setInvoices,
		triggerHaptic,
		handleShareReferral,
		handleDownloadTaxCert,
	};
}
