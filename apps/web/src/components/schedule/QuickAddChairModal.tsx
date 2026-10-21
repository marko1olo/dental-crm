import type React from "react";
import { useEffect } from "react";
import {
	QuickAddChairArchetypes,
	QuickAddChairColorPicker,
	QuickAddChairFields,
	QuickAddChairFooter,
	type QuickAddChairModalProps,
	useQuickAddChairForm,
} from "./quickAddChairModalModules";
import { QuickAddChairHeader } from "./quickAddChairModalModules/QuickAddChairHeader";

export * from "./quickAddChairModalModules";

/**
 * QuickAddChairModal component (DENTE Architecture).
 * Mandate 8d (Anti-Matryoshka, max modal depth 1).
 * Mandate 8e (Doctor & Staff Autonomy: submit button NEVER disabled).
 * Mandate 8n (Solo Doctor & Small Clinic Sovereignty: default chair count + 1).
 * Touch Ergonomics: All interactive targets >= 44px.
 */
export function QuickAddChairModal(props: QuickAddChairModalProps): React.ReactElement | null {
	const { isOpen, onClose } = props;
	const form = useQuickAddChairForm(props);

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
			className="quick-add-chair-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="quick-add-chair-modal-title"
			data-testid="quick-add-chair-modal-backdrop"
		>
			<div
				className="quick-add-chair-modal w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[var(--ink,#0f172a)] animate-in zoom-in-95 duration-150"
				onClick={(e) => e.stopPropagation()}
			>
				<QuickAddChairHeader isEditMode={form.isEditMode} onClose={onClose} />
				<form onSubmit={form.handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
					<QuickAddChairArchetypes
						selectedArchetypeId={form.selectedArchetypeId}
						selectedSpecialty={form.selectedSpecialty}
						onSelectArchetype={form.handleSelectArchetype}
					/>
					<QuickAddChairFields
						chairName={form.chairName}
						setChairName={form.setChairName}
						defaultChairName={form.defaultChairName}
						roomNumber={form.roomNumber}
						setRoomNumber={form.setRoomNumber}
						defaultRoomName={form.defaultRoomName}
						selectedSpecialty={form.selectedSpecialty}
						setSelectedSpecialty={form.setSelectedSpecialty}
						defaultDoctorId={form.defaultDoctorId}
						setDefaultDoctorId={form.setDefaultDoctorId}
						isActive={form.isActive}
						setIsActive={form.setIsActive}
						doctors={props.doctors}
					/>
					<QuickAddChairColorPicker
						selectedColor={form.selectedColor}
						onSelectColor={form.setSelectedColor}
					/>
				</form>
				<QuickAddChairFooter
					isEditMode={form.isEditMode}
					isSubmitting={form.isSubmitting}
					onClose={onClose}
					onSubmit={form.handleSubmit}
				/>
			</div>
		</div>
	);
}
