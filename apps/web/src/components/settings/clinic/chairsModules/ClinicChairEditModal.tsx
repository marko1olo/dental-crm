/**
 * apps/web/src/components/settings/clinic/chairsModules/ClinicChairEditModal.tsx
 *
 * Layer 4: Chair detail configuration modal.
 */

import React, { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import type { ClinicChairEditModalProps } from "./clinicChairsTypes";
import { ClinicChairEditModalHeader } from "./ClinicChairEditModalHeader";
import { ClinicChairEditFormFields, CHAIR_PALETTE } from "./ClinicChairEditFormFields";

export const ClinicChairEditModal: React.FC<ClinicChairEditModalProps> = ({
	isOpen,
	chair,
	onClose,
	onSave,
	specialtyLabels,
}) => {
	const [name, setName] = useState("");
	const [room, setRoom] = useState("");
	const [color, setColor] = useState(CHAIR_PALETTE[0]?.value ?? "#0d9488");
	const [specialization, setSpecialization] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (chair) {
			setName(chair.name || "");
			setRoom(chair.room || "");
			// biome-ignore lint/suspicious/noExplicitAny: chair color tag
			setColor((chair as any).color || CHAIR_PALETTE[0]?.value || "#0d9488");
			setSpecialization(chair.specialization || "");
			// biome-ignore lint/suspicious/noExplicitAny: active flag
			setIsActive((chair as any).isActive !== false);
		}
	}, [chair]);

	if (!isOpen || !chair) return null;

	const handleFormSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		setIsSaving(true);
		try {
			await onSave(chair.id, {
				name: name.trim(),
				room: room.trim() || undefined,
				specialization: specialization || undefined,
				// biome-ignore lint/suspicious/noExplicitAny: color and isActive properties
				...({ color, isActive } as any),
			});
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			data-testid="clinic-chair-edit-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="chair-edit-modal-title"
		>
			<div className="w-full max-w-md rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col">
				<ClinicChairEditModalHeader color={color} onClose={onClose} />

				<form onSubmit={handleFormSubmit} className="p-5 space-y-4">
					<ClinicChairEditFormFields
						name={name}
						setName={setName}
						room={room}
						setRoom={setRoom}
						color={color}
						setColor={setColor}
						specialization={specialization}
						setSpecialization={setSpecialization}
						isActive={isActive}
						setIsActive={setIsActive}
						specialtyLabels={specialtyLabels}
					/>

					<div className="pt-3 border-t border-[var(--line)] flex items-center justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="h-9 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
						>
							<ShieldCheck size={14} />
							<span>{isSaving ? "Сохраняю..." : "Сохранить"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
