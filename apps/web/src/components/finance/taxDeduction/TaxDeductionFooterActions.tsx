import React from "react";
import { Download, Printer } from "lucide-react";
import type { TaxDeductionFooterActionsProps } from "./types";

export const TaxDeductionFooterActions: React.FC<TaxDeductionFooterActionsProps> = ({
	activeTab,
	clinicName,
	clinicInn,
	clinicKpp,
	onClose,
	onDownloadBatchNoMedoplXml,
	onDownloadBatchXml,
	onPrintBatch,
	onDownloadNoMedoplXml,
	onDownloadXml,
	onPrintBlank,
	onPrint,
}) => {
	return (
		<div
			className="p-4 sm:p-5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between flex-wrap gap-3"
			style={{ backgroundColor: "var(--paper-soft)", borderColor: "var(--line)" }}
		>
			<div className="text-xs text-[var(--muted)]" style={{ color: "var(--muted)" }}>
				{clinicName} • ИНН {clinicInn || "—"} • КПП {clinicKpp || "—"}
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onClose}
					className="cursor-pointer transition-colors"
					style={{
						minHeight: "44px",
						padding: "8px 16px",
						borderRadius: "12px",
						border: "1px solid var(--line)",
						backgroundColor: "var(--paper)",
						color: "var(--ink)",
						fontWeight: 700,
						fontSize: "12px",
					}}
				>
					Закрыть
				</button>
				{activeTab === "registry" ? null : activeTab === "family" ? (
					<>
						<button
							type="button"
							onClick={onDownloadBatchNoMedoplXml}
							className="cursor-pointer transition-colors"
							title="Скачать файл NO_MEDOPL Формат 5.01"
							style={{
								minHeight: "44px",
								padding: "8px 14px",
								borderRadius: "12px",
								border: "1px solid var(--line)",
								backgroundColor: "var(--paper)",
								color: "var(--ink)",
								fontWeight: 700,
								fontSize: "12px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Download size={15} />
							<span>NO_MEDOPL (5.01)</span>
						</button>
						<button
							type="button"
							onClick={onDownloadBatchXml}
							className="cursor-pointer transition-colors"
							style={{
								minHeight: "44px",
								padding: "8px 16px",
								borderRadius: "12px",
								border: "1px solid rgba(13, 148, 136, 0.4)",
								backgroundColor: "rgba(13, 148, 136, 0.08)",
								color: "#0d9488",
								fontWeight: 700,
								fontSize: "12px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Download size={16} />
							<span>Выгрузить пакет XML (ТКС)</span>
						</button>
						<button
							type="button"
							onClick={onPrintBatch}
							className="cursor-pointer transition-colors"
							style={{
								minHeight: "44px",
								padding: "8px 20px",
								borderRadius: "12px",
								border: "none",
								backgroundColor: "#0d9488",
								color: "#ffffff",
								fontWeight: 700,
								fontSize: "12px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Printer size={16} />
							<span>Печать пакета справок (А4)</span>
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							onClick={onDownloadNoMedoplXml}
							className="cursor-pointer transition-colors"
							title="Скачать файл NO_MEDOPL Формат 5.01"
							style={{
								minHeight: "44px",
								padding: "8px 14px",
								borderRadius: "12px",
								border: "1px solid var(--line)",
								backgroundColor: "var(--paper)",
								color: "var(--ink)",
								fontWeight: 700,
								fontSize: "12px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Download size={15} />
							<span>NO_MEDOPL (5.01)</span>
						</button>
						<button
							type="button"
							onClick={onDownloadXml}
							className="cursor-pointer transition-colors"
							style={{
								minHeight: "44px",
								padding: "8px 16px",
								borderRadius: "12px",
								border: "1px solid rgba(13, 148, 136, 0.4)",
								backgroundColor: "rgba(13, 148, 136, 0.08)",
								color: "#0d9488",
								fontWeight: 700,
								fontSize: "12px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Download size={16} />
							<span>Выгрузить XML (ТКС)</span>
						</button>
						<button
							type="button"
							data-testid="btn-tax-print-blank"
							onClick={onPrintBlank}
							className="cursor-pointer transition-colors"
							title="Печать чистого бланка справки для налогового вычета со строками «________» для ручного заполнения"
							style={{
								minHeight: "44px",
								padding: "8px 14px",
								borderRadius: "12px",
								border: "1px solid var(--line)",
								backgroundColor: "var(--paper)",
								color: "var(--ink)",
								fontWeight: 700,
								fontSize: "12px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Printer size={15} />
							<span>Бланк («________»)</span>
						</button>
						<button
							type="button"
							onClick={onPrint}
							className="cursor-pointer transition-colors"
							title="Печать справки для налоговой (вычет 13%)"
							aria-label="Печать справки для налоговой (вычет 13%)"
							style={{
								minHeight: "44px",
								padding: "8px 20px",
								borderRadius: "12px",
								border: "none",
								backgroundColor: "#0d9488",
								color: "#ffffff",
								fontWeight: 700,
								fontSize: "12px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Printer size={16} />
							<span>Печать справки для налогового вычета (А4)</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
};
