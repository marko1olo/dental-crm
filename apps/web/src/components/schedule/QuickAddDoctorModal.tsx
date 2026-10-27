import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import type { DentalSpecialty } from "@dental/shared";
import {
	QUICK_DOCTOR_SPECIALTIES, DOCTOR_COLOR_PRESETS, DOCTOR_COLOR_PALETTE, formatDoctorShortName,
	type QuickAddDoctorData, type QuickAddDoctorModalProps,
	type DoctorSpecialtyOption, type DoctorColorPreset,
} from "./quickDoctor/quickDoctorTypes";
import { QuickDoctorModalHeader } from "./quickDoctor/QuickDoctorModalHeader";
import { QuickDoctorFormFields } from "./quickDoctor/QuickDoctorFormFields";
import { QuickDoctorColorPicker } from "./quickDoctor/QuickDoctorColorPicker";
import { useQuickAddDoctorSubmit } from "./quickDoctor/useQuickAddDoctorSubmit";

export type { QuickAddDoctorData, QuickAddDoctorModalProps, DoctorSpecialtyOption, DoctorColorPreset };
export { QUICK_DOCTOR_SPECIALTIES, DOCTOR_COLOR_PRESETS, DOCTOR_COLOR_PALETTE, formatDoctorShortName };

export function QuickAddDoctorModal({
	isOpen, onClose, onAddDoctor, onDoctorAdded,
	chairs = [], existingDoctorsCount = 0, defaultChairId = null,
}: QuickAddDoctorModalProps): React.ReactElement | null {
	const defaultDoctorName = `Врач ${existingDoctorsCount + 1}`;
	const [fullName, setFullName] = useState("");
	const [specialty, setSpecialty] = useState<DentalSpecialty>("therapist");
	const [phone, setPhone] = useState("");
	const [preferredChairId, setPreferredChairId] = useState<string>(defaultChairId || "");
	const [selectedColor, setSelectedColor] = useState<string>("#0d9488");

	const { isSubmitting, setIsSubmitting, handleSubmit } = useQuickAddDoctorSubmit({
		fullName, specialty, phone, preferredChairId, selectedColor, defaultDoctorName,
		onAddDoctor, onDoctorAdded, onClose,
	});

	const activeChairs = chairs.filter((c) => c.active !== false);

	useEffect(() => {
		if (isOpen) {
			setFullName(""); setSpecialty("therapist"); setPhone("");
			setPreferredChairId(defaultChairId || ""); setSelectedColor("#0d9488");
			setIsSubmitting(false);
		}
	}, [isOpen, defaultChairId, setIsSubmitting]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		if (isOpen) window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog" aria-modal="true" aria-labelledby="quick-add-doctor-modal-title"
			data-testid="quick-doctor-modal"
		>
			<div
				className="relative w-full max-w-lg rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150 text-[var(--ink,#0f172a)]"
				onClick={(e) => e.stopPropagation()}
			>
				<QuickDoctorModalHeader selectedColor={selectedColor} onClose={onClose} />
				<form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
					<QuickDoctorFormFields
						fullName={fullName} setFullName={setFullName} specialty={specialty} setSpecialty={setSpecialty}
						phone={phone} setPhone={setPhone} preferredChairId={preferredChairId} setPreferredChairId={setPreferredChairId}
						activeChairs={activeChairs} defaultDoctorName={defaultDoctorName}
					/>
					<QuickDoctorColorPicker selectedColor={selectedColor} onSelectColor={setSelectedColor} />
					<div className="pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-end gap-2.5">
						<button
							type="button" onClick={onClose}
							className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] transition-all cursor-pointer"
							data-testid="quick-doctor-cancel-btn" style={{ minHeight: "44px" }}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
							data-testid="quick-doctor-submit-btn" style={{ minHeight: "44px" }} title="Сохранить врача в расписание"
						>
							<Check className="w-4 h-4" aria-hidden="true" />
							<span>{isSubmitting ? "Сохранение..." : "Сохранить врача"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default QuickAddDoctorModal;
