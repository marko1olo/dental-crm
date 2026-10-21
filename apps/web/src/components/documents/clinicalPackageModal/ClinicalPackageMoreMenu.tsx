import type React from "react";
import { FileText, MoreHorizontal, X } from "lucide-react";

export interface ClinicalPackageMoreMenuProps {
	readonly isMoreMenuOpen: boolean;
	readonly setIsMoreMenuOpen: (
		open: boolean | ((prev: boolean) => boolean),
	) => void;
	readonly onPrintBlank: () => void;
	readonly onClose: () => void;
}

const menuItemClass =
	"secondary-button w-full border-none bg-transparent flex items-center justify-start gap-2 px-3 py-2 text-[13px] font-semibold cursor-pointer min-h-[36px]";

export function ClinicalPackageMoreMenu({
	isMoreMenuOpen,
	setIsMoreMenuOpen,
	onPrintBlank,
	onClose,
}: ClinicalPackageMoreMenuProps): React.JSX.Element {
	return (
		<div className="relative inline-flex items-center">
			<button
				type="button"
				className="secondary-button inline-flex items-center justify-center min-h-[36px] px-2.5"
				onClick={() => setIsMoreMenuOpen((v) => !v)}
				title="Дополнительные действия"
				aria-label="Дополнительные действия"
				data-testid="clinical-more-btn"
			>
				<MoreHorizontal size={18} aria-hidden="true" />
			</button>

			{isMoreMenuOpen && (
				<div
					className="fixed inset-0 z-30 cursor-default"
					onClick={() => setIsMoreMenuOpen(false)}
					aria-hidden="true"
				/>
			)}

			<div
				className={`absolute right-0 bottom-full mb-2 w-64 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xl z-40 py-1.5 ${
					isMoreMenuOpen ? "block" : "hidden"
				}`}
				data-testid="clinical-more-menu"
			>
				<button
					type="button"
					className={`${menuItemClass} text-[var(--ink,#0f172a)]`}
					data-testid="print-blank-clinical-package-btn"
					onClick={() => {
						setIsMoreMenuOpen(false);
						onPrintBlank();
					}}
					title="Печать чистых бланков терапевтического пакета со строками «________» для ручного заполнения"
				>
					<FileText
						size={15}
						className="text-[var(--muted)] shrink-0"
						aria-hidden="true"
					/>
					<span>Печать чистых бланков («________»)</span>
				</button>
				<div className="h-px bg-[var(--line,#e2e8f0)] my-1" />
				<button
					type="button"
					className={`${menuItemClass} text-[var(--muted,#64748b)]`}
					onClick={() => {
						setIsMoreMenuOpen(false);
						onClose();
					}}
				>
					<X size={15} className="shrink-0" aria-hidden="true" />
					<span>Закрыть окно</span>
				</button>
			</div>
		</div>
	);
}
