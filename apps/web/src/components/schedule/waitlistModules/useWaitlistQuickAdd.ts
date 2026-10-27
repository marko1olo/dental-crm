/**
 * useWaitlistQuickAdd.ts — Hook for fast 5-second patient addition to waitlist.
 */

import { useState } from "react";
import { showToast } from "../../GlobalToast";
import { type WaitlistUrgency, URGENCY_CONFIG } from "../waitlistCancellationEngine";
import { waitlistWriteHeaders, writeFailureText } from "./waitlistTypes";

export function useWaitlistQuickAdd(initialPreferredDoctorId = "", onAdded?: () => void) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [quickNewPatientMode, setQuickNewPatientMode] = useState(false);
	const [quickFullName, setQuickFullName] = useState("");
	const [quickPhone, setQuickPhone] = useState("");
	const [preferredDoctorId, setPreferredDoctorId] = useState(initialPreferredDoctorId);
	const [addUrgency, setAddUrgency] = useState<WaitlistUrgency>("acute_pain");
	const [addPreferredTime, setAddPreferredTime] = useState<string>("any");
	const [notes, setNotes] = useState("");
	const [isAddFormOpen, setIsAddFormOpen] = useState(false);

	const handleQuickAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		let effectivePatientId = selectedPatientId;
		setIsSubmitting(true);
		try {
			if (quickNewPatientMode) {
				const fName = quickFullName.trim();
				const fPhone = quickPhone.trim();
				if (!fName && !fPhone) {
					showToast("Укажите имя или телефон пациента", "warning");
					return;
				}
				try {
					const patRes = await fetch("/api/patients", {
						method: "POST",
						headers: waitlistWriteHeaders(),
						body: JSON.stringify({
							fullName: fName || `Пациент (${fPhone})`,
							phone: fPhone || null,
							allowDuplicate: true,
						}),
					});
					if (patRes.ok) {
						const patData = await patRes.json();
						const patObj = patData?.patient || patData;
						if (patObj?.id) effectivePatientId = patObj.id;
					} else {
						const errData = await patRes.json().catch(() => null);
						const existingId = errData?.existingPatient?.id || errData?.existingPatientId;
						if (patRes.status === 409 && existingId) {
							effectivePatientId = existingId;
						} else {
							showToast(errData?.message || "Не удалось создать карту нового пациента", "error");
							return;
						}
					}
				} catch {
					showToast("Ошибка связи с сервером при создании карты пациента", "error");
					return;
				}
			}

			if (!effectivePatientId) {
				showToast("Выберите или укажите пациента", "warning");
				return;
			}

			const urgencyCfg = URGENCY_CONFIG[addUrgency];
			const priorityLevel = addUrgency === "acute_pain" ? "high" : addUrgency === "ortho_endo" ? "medium" : "low";
			const preferredTimeRanges =
				addPreferredTime !== "any" || notes.trim()
					? [{ day: "any", slot: addPreferredTime, ...(notes.trim() ? { notes: notes.trim() } : {}), urgency: addUrgency }]
					: [];

			const res = await fetch("/api/waitlist", {
				method: "POST",
				headers: waitlistWriteHeaders(),
				body: JSON.stringify({
					patientId: effectivePatientId,
					preferredDoctorId: preferredDoctorId || null,
					priorityLevel,
					preferredTimeRanges,
					notes: notes.trim() || null,
					urgency: addUrgency,
				}),
			});

			if (res.ok) {
				showToast(`Пациент добавлен в лист ожидания (${urgencyCfg.shortLabel}) за 5 сек!`, "success");
				setSelectedPatientId("");
				setQuickFullName("");
				setQuickPhone("");
				setQuickNewPatientMode(false);
				setNotes("");
				setIsAddFormOpen(false);
				onAdded?.();
			} else {
				showToast(await writeFailureText(res, "добавить в лист ожидания"), "error");
			}
		} catch {
			showToast("Ошибка соединения с сервером клиники", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		isSubmitting,
		selectedPatientId,
		setSelectedPatientId,
		quickNewPatientMode,
		setQuickNewPatientMode,
		quickFullName,
		setQuickFullName,
		quickPhone,
		setQuickPhone,
		preferredDoctorId,
		setPreferredDoctorId,
		addUrgency,
		setAddUrgency,
		addPreferredTime,
		setAddPreferredTime,
		notes,
		setNotes,
		isAddFormOpen,
		setIsAddFormOpen,
		handleQuickAdd,
	};
}
