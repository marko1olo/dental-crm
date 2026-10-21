import React from "react";
import { FileCheck, X } from "lucide-react";

export interface SignatureModalHeaderProps {
	readonly onClose: () => void;
}

export const SignatureModalHeader: React.FC<SignatureModalHeaderProps> = ({ onClose }) => {
	return (
		<div className="flex items-center justify-between p-5 border-b border-[var(--border,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
			<div className="flex items-center gap-3">
				<div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
					<FileCheck size={22} />
				</div>
				<div>
					<h3 className="text-base font-extrabold text-[var(--ink)] m-0">
						Подписание плана лечения
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						Информированное добровольное согласие пациента на лечение
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors cursor-pointer"
				aria-label="Закрыть окно"
			>
				<X size={20} />
			</button>
		</div>
	);
};
