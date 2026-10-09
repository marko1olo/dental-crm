/**
 * DENTE CRM — Mobile Patient Profile Hook
 * Layer 3: State, Selectors & Callbacks
 */

import type { Appointment, Dashboard, Patient } from "@dental/shared";
import { useCallback, useMemo, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { showToast } from "../../GlobalToast";
import type { MobilePatientTab } from "./types";

export interface UseMobilePatientProfileOptions {
	patient: Patient;
	propDashboard?: Dashboard | null | undefined;
	onNewAppointment?: ((patientId: string) => void) | undefined;
	updatePatientCoreDraft?: ((field: any, value: any) => void) | undefined;
}

export function useMobilePatientProfile({
	patient,
	propDashboard,
	onNewAppointment,
	updatePatientCoreDraft,
}: UseMobilePatientProfileOptions) {
	const appLogic = useOptionalAppLogicContext();
	const dashboard = propDashboard ?? appLogic?.dashboard;

	const [activeTab, setActiveTab] = useState<MobilePatientTab>("card");
	const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

	const fullName = patient.fullName || "Пациент без имени";
	const balanceRub = Number(patient.balanceRub ?? 0);

	const patientAppointments = useMemo(() => {
		const list = (dashboard?.appointments ?? []).filter(
			(a: Appointment) => a?.patientId === patient.id,
		);
		return list.sort(
			(a, b) =>
				new Date(b?.startsAt ?? 0).getTime() -
				new Date(a?.startsAt ?? 0).getTime(),
		);
	}, [dashboard?.appointments, patient.id]);

	const patientStudies = useMemo(() => {
		const all = (dashboard?.imagingStudies ?? []) as any[];
		return all.filter((s) => String(s?.patientId) === String(patient.id));
	}, [dashboard?.imagingStudies, patient.id]);

	const patientInvoices = useMemo(() => {
		const all = (dashboard?.invoices ?? []) as any[];
		return all.filter((inv) => String(inv?.patientId) === String(patient.id));
	}, [dashboard?.invoices, patient.id]);

	const handleStartVisit = useCallback(() => {
		usePatientStore.getState().setSelectedPatientId(patient.id);
		useAppStore.getState().setCurrentView("visit");
		showToast(`Открыт приём: ${fullName}`, "success");
	}, [patient.id, fullName]);

	const handleBookAppointment = useCallback(() => {
		if (onNewAppointment) {
			onNewAppointment(patient.id);
			return;
		}
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		const currentHour = now.getHours();
		const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
		const endHour = Math.min(startHour + 1, 21);

		useScheduleStore.getState().setNewAppointmentDraft({
			patientId: patient.id,
			doctorUserId: "",
			assistantUserId: "",
			chairId: "",
			status: "planned",
			startsAt: `${todayIso}T${pad(startHour)}:00:00.000Z`,
			endsAt: `${todayIso}T${pad(endHour)}:00:00.000Z`,
			reason: "Консультация и осмотр",
			comment: "",
		});
		useAppStore.getState().setCurrentView("schedule");
		showToast(`Пациент ${fullName} выбран для записи`, "success");
	}, [onNewAppointment, patient.id, fullName]);

	const handleApplySomaticNorm = useCallback(() => {
		updatePatientCoreDraft?.(
			"notes",
			"Соматически здоров. Физиологическая норма. Аллергоанамнез не отягощен.",
		);
		showToast("Применена физиологическая норма: соматически здоров", "success");
	}, [updatePatientCoreDraft]);

	return {
		dashboard,
		activeTab,
		setActiveTab,
		isTaxModalOpen,
		setIsTaxModalOpen,
		balanceRub,
		patientAppointments,
		patientStudies,
		patientInvoices,
		handleStartVisit,
		handleBookAppointment,
		handleApplySomaticNorm,
	};
}
