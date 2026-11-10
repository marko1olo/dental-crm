/**
 * apps/web/src/components/emr/DirectEmrLauncher.tsx
 *
 * Суверенный прямой лаунчер медицинской карты пациента (Мандаты 8e, 8n, 8aq).
 * Смонтирован в AppShell.tsx для 100% доступности и глубоких ссылок.
 * Реагирует на хэши: #medical-card, #emr, #visit-diary, #card-043, #outpatient-card
 * и кастомные события: dente:open-medical-card, dente:open-emr.
 *
 * Связан напрямую на канонический SSOT: MedicalRecordStudioModal (Волна 32.1).
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MedicalRecordStudioModal } from "./MedicalRecordStudioModal";
import { MedicalCardPrintModal } from "./MedicalCardPrintModal";
import { DEFAULT_MEDICAL_CARD_DATA, resolveClinicRequisites } from "./medicalCardCatalogData";
import type { MedicalRecordData } from "./types/recordDataTypes";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import type { Dashboard, Patient } from "@dental/shared";

const EMR_URL_TOKENS = [
	"medical-card",
	"medical_card",
	"emr",
	"card-043",
	"card_043",
	"outpatient-card",
	"visit-diary",
];

function checkEmrDeepLink(): boolean {
	if (typeof window === "undefined") return false;
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();

	for (const token of EMR_URL_TOKENS) {
		if (h.includes(token) || s.includes(token)) return true;
	}
	return false;
}

function clearEmrDeepLink(): void {
	if (typeof window === "undefined") return;
	const h = (window.location.hash || "").toLowerCase();
	for (const token of EMR_URL_TOKENS) {
		if (h.includes(token)) {
			window.location.hash = "";
			break;
		}
	}
}

function getInitialEmrTab(): "overview" | "diaries" {
	if (typeof window === "undefined") return "overview";
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	if (h.includes("diary") || s.includes("diary") || h.includes("diaries") || s.includes("diaries")) {
		return "diaries";
	}
	return "overview";
}

export const DirectEmrLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkEmrDeepLink());
	const [customData, setCustomData] = useState<Partial<MedicalRecordData> | null>(null);
	const [dashboard, setDashboard] = useState<Dashboard | null>(null);

	// Подписка на изменение URL и кастомные ивенты
	useEffect(() => {
		const handleHashChange = () => {
			if (checkEmrDeepLink()) {
				setIsOpen(true);
			}
		};

		const handleCustomOpen = (event: Event) => {
			const detail = (event as CustomEvent)?.detail;
			if (detail && typeof detail === "object") {
				setCustomData(detail);
			}
			setIsOpen(true);
		};

		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("popstate", handleHashChange);
		window.addEventListener("dente:open-medical-card", handleCustomOpen);
		window.addEventListener("dente:open-emr", handleCustomOpen);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
			window.removeEventListener("dente:open-medical-card", handleCustomOpen);
			window.removeEventListener("dente:open-emr", handleCustomOpen);
		};
	}, []);

	// Фоновая гидратация демографических данных из дашборда
	useEffect(() => {
		if (!isOpen) return;

		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();

		fetch("/api/dashboard", {
			headers: {
				...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
				...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
			},
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data: Dashboard | null) => {
				if (data) setDashboard(data);
			})
			.catch((err) => {
				console.warn("DirectEmrLauncher: ошибка загрузки дашборда", err);
			});
	}, [isOpen]);

	const initialCardData: MedicalRecordData = useMemo(() => {
		const isDemo = isDemoShowcaseMode();
		const patient: Patient | undefined = dashboard?.patients?.[0];
		const staff = dashboard?.clinicSettings?.staff?.[0];
		const clinicProfile = dashboard?.clinicSettings?.profile;

		const requisites = resolveClinicRequisites(
			undefined,
			clinicProfile,
			dashboard?.clinicSettings?.staff,
		);

		return {
			...DEFAULT_MEDICAL_CARD_DATA,
			clinic: {
				...DEFAULT_MEDICAL_CARD_DATA.clinic,
				...requisites,
			},
			passport: {
				...DEFAULT_MEDICAL_CARD_DATA.passport,
				medicalCardNumber: (patient as any)?.cardNumber || (isDemo ? "МК-001" : ""),
				cardOpenedDate: patient?.createdAt ? new Date(patient.createdAt).toLocaleDateString("ru-RU") : (isDemo ? "01.09.2026" : ""),
				patientFullName: patient?.fullName || (isDemo ? "Смирнова Екатерина Васильевна" : ""),
				patientBirthDate: patient?.birthDate || (isDemo ? "1988-04-12" : ""),
				patientSex: (patient?.gender === "female" ? "female" : "male") as "male" | "female",
				patientPhone: patient?.phone || (isDemo ? "+7 (926) 555-12-34" : ""),
				patientAddressRegistration: isDemo ? "г. Москва, ул. Арбат, д. 24, кв. 12" : "",
				patientAddressResidence: isDemo ? "г. Москва, ул. Арбат, д. 24, кв. 12" : "",
				attendingDoctorFullName: staff?.fullName || (isDemo ? "Д-р Соколов А. В." : ""),
				attendingDoctorSpecialty: (staff as any)?.specialty || (isDemo ? "Врач-стоматолог-терапевт" : ""),
				primaryDiagnosisText: isDemo ? "K02.1 Кариес дентина зуба 16" : "",
				primaryDiagnosisIcd10: isDemo ? "K02.1" : "",
			},
			...(customData || {}),
		};
	}, [dashboard, customData]);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setCustomData(null);
		clearEmrDeepLink();
	}, []);

	const handleSave = useCallback((updated: MedicalRecordData) => {
		try {
			if (typeof sessionStorage !== "undefined") {
				sessionStorage.setItem(
					`dente:medical_card_saved:${updated.passport.medicalCardNumber}`,
					JSON.stringify(updated),
				);
			}
		} catch (err) {
			console.warn("DirectEmrLauncher: не удалось сохранить черновик в sessionStorage", err);
		}
	}, []);

	if (!isOpen) return null;

	return (
		<MedicalRecordStudioModal
			isOpen={isOpen}
			onClose={handleClose}
			initialData={initialCardData}
			onSave={handleSave}
			isDraft={true}
			initialTab={getInitialEmrTab()}
		/>
	);
};

export { MedicalCardPrintModal };
export default DirectEmrLauncher;
