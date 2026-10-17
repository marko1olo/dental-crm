/**
 * DENTE Dental CRM — Leads Convert Defaults Hook
 * Mandate 8e & 8n: Solo Doctor Autonomy & 1-Click Booking Defaults, Mandate 8b (<= 120 lines)
 */

import { useEffect, useState } from "react";
import type { Lead } from "../../../store/leadsStore";
import type { BookableChair, BookableDoctor } from "../leadsKanbanTypes";

interface UseLeadConvertDefaultsProps {
	isOpen: boolean;
	lead: Lead | null;
	appointmentDate: string;
	setAppointmentDate: (d: string) => void;
	appointmentTime: string;
	setAppointmentTime: (t: string) => void;
	selectedDoctorId: string;
	setSelectedDoctorId: (id: string) => void;
	selectedChairId: string;
	setSelectedChairId: (id: string) => void;
	effectiveStaff: BookableDoctor[];
	effectiveChairs: BookableChair[];
}

export function useLeadConvertDefaults({
	isOpen, lead, appointmentDate, setAppointmentDate, appointmentTime, setAppointmentTime,
	selectedDoctorId, setSelectedDoctorId, selectedChairId, setSelectedChairId,
	effectiveStaff, effectiveChairs,
}: UseLeadConvertDefaultsProps) {
	const defaultReason = lead
		? (Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
			? `Первичная консультация: ${lead.clinicalTags.join(", ")}`
			: (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация"))
		: "Первичная консультация";

	const [reason, setReason] = useState(defaultReason);
	const [comment, setComment] = useState(lead?.notes || "");

	useEffect(() => {
		if (lead) {
			const initialReason = Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
				? `Первичная консультация: ${lead.clinicalTags.join(", ")}`
				: (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация");
			setReason(initialReason);
			setComment(lead.notes || "");
		}
	}, [lead?.id, lead?.notes, lead?.clinicalTags]);

	useEffect(() => {
		if (isOpen) {
			if (!appointmentDate) {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				const yyyy = tomorrow.getFullYear();
				const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
				const dd = String(tomorrow.getDate()).padStart(2, "0");
				setAppointmentDate(`${yyyy}-${mm}-${dd}`);
			}
			if (!appointmentTime) setAppointmentTime("10:00");
			if (!selectedDoctorId && effectiveStaff.length > 0) setSelectedDoctorId(effectiveStaff[0]?.id || "");
			if (!selectedChairId && effectiveChairs.length > 0) setSelectedChairId(effectiveChairs[0]?.id || "");
		}
	}, [isOpen, appointmentDate, appointmentTime, selectedDoctorId, selectedChairId, effectiveStaff, effectiveChairs, setAppointmentDate, setAppointmentTime, setSelectedDoctorId, setSelectedChairId]);

	return { reason, setReason, comment, setComment };
}
