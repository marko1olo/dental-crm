/**
 * useQuickAddDoctorSubmit.ts — Form submission logic and chair persistence for QuickAddDoctorModal.
 */

import { useState } from "react";
import type { DentalSpecialty } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";
import {
	QUICK_DOCTOR_SPECIALTIES,
	formatDoctorShortName,
	type QuickAddDoctorData,
	type QuickAddDoctorModalProps,
} from "./quickDoctorTypes";

interface UseQuickAddDoctorSubmitParams {
	fullName: string;
	specialty: DentalSpecialty;
	phone: string;
	preferredChairId: string;
	selectedColor: string;
	defaultDoctorName: string;
	onAddDoctor?: QuickAddDoctorModalProps["onAddDoctor"];
	onDoctorAdded?: QuickAddDoctorModalProps["onDoctorAdded"];
	onClose: () => void;
}

export function useQuickAddDoctorSubmit({
	fullName, specialty, phone, preferredChairId, selectedColor, defaultDoctorName,
	onAddDoctor, onDoctorAdded, onClose,
}: UseQuickAddDoctorSubmitParams) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (isSubmitting) return;

		const finalName = fullName.trim() || defaultDoctorName;
		const shortName = formatDoctorShortName(finalName);
		const specialtyOption = QUICK_DOCTOR_SPECIALTIES.find((s) => s.id === specialty) || QUICK_DOCTOR_SPECIALTIES[0]!;

		if (!fullName.trim()) {
			showToast(`Имя не указано. Заведено имя «${finalName}»`, "info", 3500);
		}

		setIsSubmitting(true);
		try {
			const docId = `doc-quick-${Date.now()}`;
			const finalPreferredChairId = preferredChairId.trim() || null;

			const doctorData: QuickAddDoctorData = {
				id: docId, fullName: finalName, name: finalName, shortName, specialty,
				specialtyLabel: specialtyOption.label, phone: phone.trim() || null,
				preferredChairId: finalPreferredChairId, color: selectedColor, role: "doctor", active: true,
			};

			if (typeof window !== "undefined" && finalPreferredChairId) {
				const storedMap = safeLocalStorageGetJson<Record<string, string>>("dente_doctor_preferred_chairs", {});
				storedMap[docId] = finalPreferredChairId;
				safeLocalStorageSetJson("dente_doctor_preferred_chairs", storedMap);

				const chairDefaultMap = safeLocalStorageGetJson<Record<string, string>>("dente_chair_default_doctors", {});
				chairDefaultMap[finalPreferredChairId] = docId;
				safeLocalStorageSetJson("dente_chair_default_doctors", chairDefaultMap);
			}

			const addDoctorFn = onAddDoctor || onDoctorAdded;
			if (addDoctorFn) {
				await Promise.resolve(addDoctorFn(doctorData));
			} else if (typeof fetch === "function") {
				await fetch("/api/settings/staff", {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						fullName: finalName, role: "doctor", specialties: [specialty], phone: phone.trim() || null,
					}),
				}).catch(() => {});
			}

			showToast(`Врач ${shortName} успешно добавлен и доступен в расписании`, "success", 4000);
			onClose();
		} catch {
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	return { isSubmitting, setIsSubmitting, handleSubmit };
}
