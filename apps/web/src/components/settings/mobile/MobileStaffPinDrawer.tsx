import React, { useState } from "react";
import type { StaffMember } from "@dental/shared";
import { X } from "lucide-react";

interface MobileStaffPinDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	pinTargetStaff: StaffMember | null;
	isSubmitting: boolean;
	onSavePin: (targetStaff: StaffMember, pin: string) => void;
}

export const MobileStaffPinDrawer: React.FC<MobileStaffPinDrawerProps> = ({
	isOpen,
	onClose,
	pinTargetStaff,
	isSubmitting,
	onSavePin,
}) => {
	const [pinValue, setPinValue] = useState("");

	if (!isOpen || !pinTargetStaff) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSavePin(pinTargetStaff, pinValue);
	};

	return (
		<div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
			<div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
			<div className="relative z-10 w-full flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-250 pb-[max(16px,env(safe-area-inset-bottom))]">
				<div className="flex justify-center -mt-2 cursor-grab" onClick={onClose}>
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				<div className="flex items-center justify-between border-b border-[var(--line-subtle)] pb-2">
					<h3 className="text-[17px] font-semibold text-[var(--ink)]">PIN-код для планшета</h3>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)]"
					>
						<X size={18} />
					</button>
				</div>

				<p className="text-xs text-[var(--muted)]">
					Установите 4-значный PIN-код для быстрой авторизации сотрудника{" "}
					<strong>{pinTargetStaff.fullName}</strong> на планшете у кресла.
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<input
						type="password"
						maxLength={4}
						inputMode="numeric"
						required
						autoFocus
						placeholder="••••"
						value={pinValue}
						onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
						className="w-full h-14 text-center text-3xl font-mono tracking-widest rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
					/>

					<button
						type="submit"
						disabled={isSubmitting || pinValue.length !== 4}
						className="w-full h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
					>
						<span>{isSubmitting ? "Сохранение..." : "Сохранить PIN-код"}</span>
					</button>
				</form>
			</div>
		</div>
	);
};
