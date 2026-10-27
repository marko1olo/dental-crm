/**
 * QuickDoctorModalHeader.tsx — Header bar for QuickAddDoctorModal.
 */

import React from "react";
import { UserPlus, X } from "lucide-react";

interface QuickDoctorModalHeaderProps {
	selectedColor: string;
	onClose: () => void;
}

export function QuickDoctorModalHeader({ selectedColor, onClose }: QuickDoctorModalHeaderProps) {
	return (
		<div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			<div className="flex items-center gap-3">
				<div
					className="w-11 h-11 rounded-xl flex items-center justify-center shadow-xs shrink-0"
					style={{
						backgroundColor: `${selectedColor}18`,
						color: selectedColor,
						border: `1px solid ${selectedColor}40`,
					}}
				>
					<UserPlus className="w-5 h-5" aria-hidden="true" />
				</div>
				<div>
					<h2
						id="quick-add-doctor-modal-title"
						className="text-base sm:text-lg font-bold tracking-tight text-[var(--ink,#0f172a)]"
					>
						Добавить врача в расписание
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
						Быстрое добавление врача и закрепление кресла
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-transparent hover:border-[var(--line,#e2e8f0)] transition-all cursor-pointer shrink-0"
				aria-label="Закрыть окно"
				data-testid="quick-doctor-close-btn"
				style={{ minHeight: "44px", minWidth: "44px" }}
			>
				<X className="w-5 h-5" aria-hidden="true" />
			</button>
		</div>
	);
}
