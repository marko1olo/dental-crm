import React from "react";
import { FileText, MoreHorizontal, ShieldCheck, Sparkles, X } from "lucide-react";

interface PrimaryIntakeMoreDropdownProps {
	isMoreMenuOpen: boolean;
	setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isNormApplied: boolean;
	onFillSomaticNorm: () => void;
	onPrintBlankPackage: () => void;
	onOpenAutoclaveLog257?: (() => void) | undefined;
	onClose: () => void;
}

export function PrimaryIntakeMoreDropdown({
	isMoreMenuOpen,
	setIsMoreMenuOpen,
	isNormApplied,
	onFillSomaticNorm,
	onPrintBlankPackage,
	onOpenAutoclaveLog257,
	onClose,
}: PrimaryIntakeMoreDropdownProps) {
	const itemClass = "secondary-button w-full border-none bg-transparent flex items-center justify-start gap-2 px-3 py-2 text-[13px] font-semibold text-[var(--ink)] cursor-pointer min-h-[36px]";

	return (
		<div className="relative inline-flex items-center">
			<button
				type="button"
				className="secondary-button"
				onClick={() => setIsMoreMenuOpen((v) => !v)}
				title="Дополнительные действия (анкета соматики, чистые бланки, закрыть)"
				aria-label="Дополнительные действия"
				data-testid="primary-intake-more-btn"
				style={{ minHeight: "36px", padding: "0 10px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
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
				className={`absolute right-0 bottom-full mb-2 w-72 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl z-40 py-1.5 ${
					isMoreMenuOpen ? "block" : "hidden"
				}`}
				data-testid="primary-intake-more-menu"
			>
				<button
					type="button"
					className={itemClass}
					data-testid="footer-fill-somatic-norm-btn"
					onClick={() => {
						setIsMoreMenuOpen(false);
						onFillSomaticNorm();
					}}
					title="Заполнить анкету здоровья нормой (аллергий нет, противопоказаний нет)"
				>
					<Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
					<span>{isNormApplied ? "Анкета в норме" : "Анкета: заполнить нормой"}</span>
				</button>
				<button
					type="button"
					className={itemClass}
					data-testid="print-blank-intake-package-btn"
					onClick={() => {
						setIsMoreMenuOpen(false);
						onPrintBlankPackage();
					}}
					title="Печать чистых бланков всего пакета со строками «________» для ручного заполнения"
				>
					<FileText size={15} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
					<span>Печать чистых бланков пакета («________»)</span>
				</button>
				{onOpenAutoclaveLog257 && (
					<button
						type="button"
						className={`${itemClass} !text-[var(--teal,#0d9488)]`}
						data-testid="primary-intake-open-autoclave-log-btn"
						onClick={() => {
							setIsMoreMenuOpen(false);
							onOpenAutoclaveLog257();
						}}
						title="Журнал контроля стерилизации и автоклавирования для проверок"
					>
						<ShieldCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
						<span>Журнал стерилизации и автоклавирования</span>
					</button>
				)}
				<div className="h-px bg-[var(--line,#e2e8f0)] my-1" />
				<button
					type="button"
					className={`${itemClass} !text-[var(--muted,#64748b)]`}
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
