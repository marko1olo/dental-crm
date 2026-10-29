/**
 * DirectVisitLauncher.tsx
 * DENTE Dental CRM — Sovereign Standalone Chairside Visit & EMR Diary Launcher (Mandates 8e, 8n, 8s, 8aq)
 * Mounted in AppShell to provide 0-dependency, resilient direct deep-link access
 * to Chairside Visit & EMR Diary (#visit, ?visit_standalone=1, ?standalone=visit).
 */

import React, { useEffect, useState, useMemo } from "react";
import { VisitView } from "./VisitView";
import { MobileChairsideVisitWorkspace } from "./MobileChairsideVisitWorkspace";
import { useIsMobile } from "../../hooks/useIsMobile";
import { hasUrlToken, clearUrlTokens } from "../appLayout/modalsContainerModules/standalone/deepLinkUrl";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { AppLogicProvider } from "../../contexts/AppLogicContext";
import { PrescriptionModal } from "../prescriptions/PrescriptionModal";
import type { Dashboard, Patient, Appointment } from "@dental/shared";

const VISIT_URL_TOKENS = [
	"visit_standalone",
	"standalone=visit",
	"standalone-visit",
	"chairside-visit",
	"clinical_diary_standalone",
	"rx",
	"rx=1",
	"prescription",
	"prescriptions",
	"standalone=prescription",
	"prescription_standalone",
];

export const DirectVisitLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return hasUrlToken(VISIT_URL_TOKENS);
	});

	const [dashboard, setDashboard] = useState<Dashboard | null>(null);
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
	const [visitSubViewTab, setVisitSubViewTab] = useState<string>(() => {
		if (typeof window === "undefined") return "emk";
		const p = new URLSearchParams(window.location.search);
		return p.get("subtab") || p.get("tab") || "emk";
	});
	const [visitNoteForm, setVisitNoteForm] = useState<Record<string, any>>({
		complaints: "Жалобы на кратковременные боли от сладкого и холодного в области зуба 16.",
		anamnesis: "Анамнез без особенностей. Аллергологический анамнез не отягощен. Соматически здоров.",
		objective: "При осмотре: зуб 16 интактен по окклюзионной поверхности, на медиальной поверхности кариозная полость в пределах средних слоев дентина. Зондирование слабо болезненно по эмалево-дентинной границе. Перкуссия безболезненна. ЭОД 6 мкА.",
		assessment: "K02.1 Кариес дентина (средний кариес зуба 16).",
		treatment: "Под инфильтрационной анестезией Sol. Ultracaini D-S 1:200000 1.7 ml проведено препарирование кариозной полости зуба 16. Медикаментозная обработка 2% р-ром хлоргексидина. Адгезивный протокол Single Bond Universal. Пломба светоотверждаемым композитом Filtek Ultimate A3. Шлифовка, полировка дисками Sof-Lex и пастой Prisma Gloss. Окклюзионные контакты выверены.",
		complications: "Осложнений в ходе лечения не возникло. Рекомендации даны.",
	});

	const isMobile = useIsMobile(768);

	const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return s.includes("rx") || s.includes("prescription") || h.includes("rx") || h.includes("prescription");
	});

	useEffect(() => {
		const checkUrl = () => {
			setIsOpen(hasUrlToken(VISIT_URL_TOKENS));
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (s.includes("rx") || s.includes("prescription") || h.includes("rx") || h.includes("prescription")) {
				setIsPrescriptionModalOpen(true);
			}
		};
		const handleOpenRx = () => setIsPrescriptionModalOpen(true);
		window.addEventListener("dente:open-prescriptions", handleOpenRx);
		window.addEventListener("dente-open-prescriptions", handleOpenRx);
		window.addEventListener("dente-open-prescription", handleOpenRx);
		window.addEventListener("hashchange", checkUrl);
		window.addEventListener("popstate", checkUrl);
		return () => {
			window.removeEventListener("dente:open-prescriptions", handleOpenRx);
			window.removeEventListener("dente-open-prescriptions", handleOpenRx);
			window.removeEventListener("dente-open-prescription", handleOpenRx);
			window.removeEventListener("hashchange", checkUrl);
			window.removeEventListener("popstate", checkUrl);
		};
	}, []);

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
				if (data) {
					setDashboard(data);
					if (data.patients?.[0]?.id && !selectedPatientId) {
						setSelectedPatientId(data.patients[0].id);
					}
				}
			})
			.catch(() => {});
	}, [isOpen, selectedPatientId]);

	const activePatient: Patient | null = useMemo(() => {
		if (!dashboard?.patients) {
			return {
				id: "01a00000-0000-0000-0000-000000000001",
				organizationId: "01a00000-0000-0000-0000-000000000000",
				fullName: "Смирнова Екатерина Васильевна",
				birthDate: "1988-04-12",
				phone: "+7 (926) 555-12-34",
				cardNumber: "МК-4821",
				gender: "female",
				allergies: [],
				chronicDiseases: [],
				status: "active",
				createdAt: "2026-01-10T10:00:00Z",
				updatedAt: "2026-10-28T12:00:00Z",
			} as unknown as Patient;
		}
		if (selectedPatientId) {
			const found = dashboard.patients.find((p) => p.id === selectedPatientId);
			if (found) return found;
		}
		return dashboard.patients[0] || null;
	}, [dashboard?.patients, selectedPatientId]);

	const activeAppointment: Appointment | null = useMemo(() => {
		if (dashboard?.appointments && activePatient) {
			const app = dashboard.appointments.find((a) => a.patientId === activePatient.id);
			if (app) return app;
		}
		return {
			id: "01a00000-0000-0003-0000-000000000001",
			organizationId: "01a00000-0000-0000-0000-000000000000",
			patientId: activePatient?.id || "01a00000-0000-0000-0000-000000000001",
			patientName: activePatient?.fullName || "Смирнова Екатерина Васильевна",
			startsAt: new Date().toISOString(),
			endsAt: new Date(Date.now() + 3600000).toISOString(),
			status: "in_progress",
			chairId: "chair-1",
			notes: "Лечение среднего кариеса 16",
		} as unknown as Appointment;
	}, [dashboard?.appointments, activePatient]);

	const activeDoctor = useMemo(() => {
		const staff = dashboard?.clinicSettings?.staff?.[0];
		return {
			id: staff?.id || "01a00000-0000-0002-0000-000000000001",
			fullName: staff?.fullName || "Д-р Соколов А. В.",
			specialty: staff?.specialty || "Врач-стоматолог-терапевт",
		};
	}, [dashboard?.clinicSettings?.staff]);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		clearUrlTokens(VISIT_URL_TOKENS);
		if (typeof window !== "undefined") {
			window.location.hash = "#schedule";
		}
	};

	const updateVisitNoteField = (field: string, value: string) => {
		setVisitNoteForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleApplySomaticNormQuick = () => {
		setVisitNoteForm((prev) => ({
			...prev,
			anamnesis: "Соматически здоров. Аллергологический анамнез не отягощен. Хронические заболевания отрицает.",
		}));
	};

	const fallbackAppLogic: any = useMemo(() => ({
		dashboard,
		activePatient,
		activeDoctor,
		odontogramUseSurfaces: true,
		auth: { role: "owner" },
		money: (rub: number) => `${rub.toLocaleString("ru-RU")} ₽`,
	}), [dashboard, activePatient, activeDoctor]);

	return (
		<AppLogicProvider value={fallbackAppLogic}>
			<div className="fixed inset-0 z-[99999] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] overflow-y-auto">
				{isMobile ? (
					<MobileChairsideVisitWorkspace
						activePatient={activePatient}
						activeAppointment={activeAppointment}
						activeDoctor={activeDoctor}
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						flushPendingVisitSaves={() => {}}
						handleApplySomaticNormQuick={handleApplySomaticNormQuick}
						handleFinishVisitAction={handleClose}
						handlePrintForm043uFast={() => {}}
						handleOpenPrescription={() => setIsPrescriptionModalOpen(true)}
						consolidatedAllergyChip="Нет аллергий"
						patientAge={38}
						toothStateByCode={{ 16: "caries", 24: "filled", 36: "pulpitis" }}
						setToothState={() => {}}
						onClose={handleClose}
						testId="mobile-chairside-visit-workspace"
					/>
				) : (
					<div className="p-4 sm:p-6 max-w-[1440px] mx-auto min-h-screen">
						<VisitView
							dashboard={dashboard || undefined}
							activePatient={activePatient}
							activeAppointment={activeAppointment}
							activeDoctor={activeDoctor}
							visitSubViewTab={visitSubViewTab as any}
							setVisitSubViewTab={setVisitSubViewTab as any}
							visitNoteForm={visitNoteForm}
							updateVisitNoteField={updateVisitNoteField}
							handleApplySomaticNormQuick={handleApplySomaticNormQuick}
							handleFinishVisitAction={handleClose}
							setSelectedPatientId={setSelectedPatientId}
							isQueueCockpitForced={false}
						/>
					</div>
				)}
				{isMobile && isPrescriptionModalOpen && (
					<PrescriptionModal
						isOpen={isPrescriptionModalOpen}
						onClose={() => setIsPrescriptionModalOpen(false)}
						patient={activePatient}
						doctorName={activeDoctor.fullName}
						doctorSpecialty={activeDoctor.specialty}
						diary={{
							diagnosisIcd10: "K02.1",
							anamnesisVitae: visitNoteForm.anamnesis,
						}}
						allergies={activePatient?.allergies && activePatient.allergies.length > 0 ? activePatient.allergies : ["Пенициллины", "Аспирин"]}
						onInsertToDiary={(rxText) => {
							updateVisitNoteField(
								"treatment",
								`${visitNoteForm.treatment ? `${visitNoteForm.treatment}\n\n` : ""}Назначения: ${rxText}`
							);
						}}
					/>
				)}
			</div>
		</AppLogicProvider>
	);
};
