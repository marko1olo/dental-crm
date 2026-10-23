import React, { useState } from "react";
import { CheckCircle2, Zap, Printer, MoreHorizontal, FileText, X } from "lucide-react";

export interface SurgicalPackageFooterProps {
	missingCount: number;
	onBatchCreate: () => void;
	onBatchPrint: () => void;
	onPrintBlank: () => void;
	onClose: () => void;
}

export const SurgicalPackageFooter: React.FC<SurgicalPackageFooterProps> = ({
	missingCount,
	onBatchCreate,
	onBatchPrint,
	onPrintBlank,
	onClose,
}) => {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	return (
		<div className="document-package-modal-footer">
			<div className="flex items-center gap-2 flex-wrap">
				{missingCount > 0 ? (
					<button
						type="button"
						className="secondary-button inline-flex items-center gap-1.5 min-h-[36px] font-semibold"
						onClick={onBatchCreate}
						data-testid="surgical-batch-create-btn"
					>
						<Zap size={15} aria-hidden="true" />
						<span>Сформировать в базе ({missingCount})</span>
					</button>
				) : (
					<span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--success-fg,#10b981)]">
						<CheckCircle2 size={15} aria-hidden="true" />
						Комплект в базе сформирован
					</span>
				)}

				<button
					type="button"
					className="primary-button inline-flex items-center gap-2 min-h-[36px] px-4 py-2 font-bold rounded-lg cursor-pointer bg-[var(--teal-fill,#0d9488)] text-white border-0"
					onClick={onBatchPrint}
					data-testid="surgical-batch-print-btn"
				>
					<Printer size={16} aria-hidden="true" />
					<span>Печать пакета (3 бланка)</span>
				</button>
			</div>

			<div className="relative inline-flex items-center">
				<button
					type="button"
					className="secondary-button inline-flex items-center justify-center min-h-[36px] px-2.5"
					onClick={() => setIsMoreMenuOpen((v) => !v)}
					title="Дополнительные действия"
					aria-label="Дополнительные действия"
					data-testid="surgical-more-btn"
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
					data-testid="surgical-more-menu"
				>
					<button
						type="button"
						className="secondary-button w-full border-0 bg-transparent flex items-center justify-start gap-2 px-3 py-2 text-[13px] font-semibold text-[var(--ink,#0f172a)] cursor-pointer min-h-[36px]"
						data-testid="print-blank-surgical-package-btn"
						onClick={() => {
							setIsMoreMenuOpen(false);
							onPrintBlank();
						}}
						title="Печать чистых бланков хирургического пакета со строками «________» для ручного заполнения"
					>
						<FileText size={15} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
						<span>Печать чистых бланков («________»)</span>
					</button>
					<div className="h-px bg-[var(--line,#e2e8f0)] my-1" />
					<button
						type="button"
						className="secondary-button w-full border-0 bg-transparent flex items-center justify-start gap-2 px-3 py-2 text-[13px] font-semibold text-[var(--muted,#64748b)] cursor-pointer min-h-[36px]"
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
		</div>
	);
};
