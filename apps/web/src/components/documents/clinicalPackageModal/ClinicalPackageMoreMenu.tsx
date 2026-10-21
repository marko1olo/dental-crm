import React from "react";
import { FileText, MoreHorizontal, X } from "lucide-react";

export interface ClinicalPackageMoreMenuProps {
	readonly isMoreMenuOpen: boolean;
	readonly setIsMoreMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
	readonly onPrintBlank: () => void;
	readonly onClose: () => void;
}

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
				className="secondary-button"
				onClick={() => setIsMoreMenuOpen((v) => !v)}
				title="Дополнительные действия"
				aria-label="Дополнительные действия"
				data-testid="clinical-more-btn"
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
				className={`absolute right-0 bottom-full mb-2 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl z-40 py-1.5 ${
					isMoreMenuOpen ? "block" : "hidden"
				}`}
				style={{ background: "var(--paper, #ffffff)", border: "1px solid var(--line, #e2e8f0)" }}
				data-testid="clinical-more-menu"
			>
				<button
					type="button"
					className="secondary-button w-full"
					data-testid="print-blank-clinical-package-btn"
					onClick={() => {
						setIsMoreMenuOpen(false);
						onPrintBlank();
					}}
					style={{
						width: "100%",
						border: "none",
						background: "transparent",
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-start",
						gap: "8px",
						padding: "8px 12px",
						fontSize: "13px",
						fontWeight: 600,
						color: "var(--ink, #0f172a)",
						cursor: "pointer",
						minHeight: "36px",
					}}
					title="Печать чистых бланков терапевтического пакета со строками «________» для ручного заполнения"
				>
					<FileText size={15} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
					<span>Печать чистых бланков («________»)</span>
				</button>
				<div style={{ height: "1px", background: "var(--line, #e2e8f0)", margin: "4px 0" }} />
				<button
					type="button"
					className="secondary-button w-full"
					onClick={() => {
						setIsMoreMenuOpen(false);
						onClose();
					}}
					style={{
						width: "100%",
						border: "none",
						background: "transparent",
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-start",
						gap: "8px",
						padding: "8px 12px",
						fontSize: "13px",
						fontWeight: 600,
						color: "var(--muted, #64748b)",
						cursor: "pointer",
						minHeight: "36px",
					}}
				>
					<X size={15} className="shrink-0" aria-hidden="true" />
					<span>Закрыть окно</span>
				</button>
			</div>
		</div>
	);
}
