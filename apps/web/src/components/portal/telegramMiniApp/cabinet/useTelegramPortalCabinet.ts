import { useCallback, useMemo, useState } from "react";
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
		patientId: propPatientId,
		initialTab = "appointments",
		initialTaxSheetOpen = false,
	} = options;

	const isDemo = isDemoShowcaseMode();
	const [activeTab, setActiveTab] = useState<TelegramCabinetTab>(initialTab);

	// Семейный профиль
	const [activeFamilyMemberId, setActiveFamilyMemberId] = useState<string>("self");
	const [familyMembers] = useState<FamilyMember[]>(() =>
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

	// Подтверждение визита в 1 тап
	const handleConfirmAppointment = useCallback((id: string) => {
		triggerHaptic("medium");
		setAppointments((prev) =>
			prev.map((app) => (app.id === id ? { ...app, isConfirmed: true } : app)),
		);
	}, [triggerHaptic]);

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

	const handleDownloadTaxCert = useCallback(() => {
		triggerHaptic("medium");
		setTaxCopiedNotice(true);
		setTimeout(() => setTaxCopiedNotice(false), 3000);
	}, [triggerHaptic]);

	return {
		isDemo,
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
