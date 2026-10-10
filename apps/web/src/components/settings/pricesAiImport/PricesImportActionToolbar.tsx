import { CheckCircle2, Database, Sparkles, X } from "lucide-react";
import React from "react";
import type { PricesImportActionToolbarProps } from "./types";

export const PricesImportActionToolbar: React.FC<
	PricesImportActionToolbarProps
> = ({
	importResult,
	isImporting,
	validRowsCount,
	onOpenDiffModal,
	onSubmitBatchImport,
}) => {
	return (
		<div className="pricelist-save-bar">
			<div>
				{importResult?.count !== undefined && (
					<span
						style={{
							color: "var(--teal)",
							fontWeight: 600,
							fontSize: "14px",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<CheckCircle2 size={16} />
						Успешно импортировано: {importResult.count} услуг. База обновлена.
					</span>
				)}
				{importResult?.error && (
					<span
						style={{
							color: "var(--danger-color, #ef4444)",
							fontWeight: 600,
							fontSize: "14px",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<X size={16} />
						Ошибка: {importResult.error}
					</span>
				)}
			</div>

			<div className="flex items-center gap-2">
				<button
					className="secondary-button h-8 px-3 text-[13px] font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
					type="button"
					onClick={onOpenDiffModal}
				>
					<Sparkles size={15} className="text-[var(--teal)] shrink-0" />
					<span>Сопоставление с каталогом услуг</span>
				</button>

				<button
					className="primary-button h-8 px-4 text-[13px] font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					type="button"
					disabled={isImporting || validRowsCount === 0}
					onClick={onSubmitBatchImport}
				>
					<Database size={15} className="shrink-0" />
					<span>
						{isImporting
							? "Импорт в базу..."
							: `Импортировать в прейскурант (${validRowsCount})`}
					</span>
				</button>
			</div>
		</div>
	);
};
