import { RefreshCw, Save, Shield } from "lucide-react";
import type React from "react";

interface FooterProps {
	onClose: () => void;
	onSave: () => void;
	isSaving: boolean;
}

export const StaffProfileFooter: React.FC<FooterProps> = ({ onClose, onSave, isSaving }) => {
	return (
		<footer className="staff-profile-modal-footer p-3.5 border-t border-[var(--line)] flex items-center justify-between flex-wrap gap-2">
			<div className="staff-profile-footer-left flex items-center gap-1.5 text-xs text-[var(--muted)]">
				<Shield className="w-4 h-4 text-emerald-500" />
				<span>Защита персональных данных и аудит сессий активны</span>
			</div>

			<div className="staff-profile-footer-actions flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="h-9 min-h-[44px] px-4 rounded-xl text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={onSave}
					disabled={isSaving}
					className="h-9 min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
				>
					{isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
					<span>Сохранить карточку</span>
				</button>
			</div>
		</footer>
	);
};
