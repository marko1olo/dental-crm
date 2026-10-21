/**
 * DmsRegistryModalFooter.tsx — Панель кнопок экспорта и печати актов ДМС
 */

import { Download, FileCheck, FileCode, Printer } from "lucide-react";
import React from "react";

export interface DmsRegistryModalFooterProps {
	readonly totalRows: number;
	readonly onClose: () => void;
	readonly onExportCsv: () => void;
	readonly onExportXml: () => void;
	readonly onPrintMeeAct: () => void;
	readonly onPrintAct: () => void;
}

export function DmsRegistryModalFooter({
	totalRows,
	onClose,
	onExportCsv,
	onExportXml,
	onPrintMeeAct,
	onPrintAct,
}: DmsRegistryModalFooterProps) {
	return (
		<div className="dms-modal-footer" style={{ justifyContent: "space-between" }}>
			<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
				Строк в реестре: <strong>{totalRows}</strong>
			</div>

			<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
				<button
					type="button"
					className="dms-btn dms-btn-secondary secondary-button"
					onClick={onClose}
				>
					Закрыть
				</button>

				<button
					type="button"
					className="dms-btn dms-btn-secondary secondary-button"
					onClick={onExportCsv}
					title="Быстрый экспорт в CSV/Excel (с кодировкой UTF-8 BOM и точкой с запятой)"
				>
					<Download size={18} />
					Экспорт реестра XLS/CSV
				</button>

				<button
					type="button"
					className="dms-btn dms-btn-secondary secondary-button"
					onClick={onExportXml}
					title="Экспорт в электронный XML-формат реестра ДМС для страховых компаний"
				>
					<FileCode size={18} />
					Экспорт XML
				</button>

				<button
					type="button"
					className="dms-btn dms-btn-secondary secondary-button"
					onClick={onPrintMeeAct}
					title="Сформировать официальный Акт медико-экономической экспертизы (МЭЭ) с обоснованием по СтАР"
				>
					<FileCheck size={18} />
					Печать Акта МЭЭ
				</button>

				<button
					type="button"
					className="dms-btn dms-btn-primary primary-button"
					onClick={onPrintAct}
					title="Сформировать печатный двусторонний акт сдачи-приемки оказанных услуг"
				>
					<Printer size={18} />
					Печать двустороннего акта
				</button>
			</div>
		</div>
	);
}
