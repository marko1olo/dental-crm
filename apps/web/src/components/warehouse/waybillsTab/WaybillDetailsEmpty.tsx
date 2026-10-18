import { FileText, Plus } from "lucide-react";
import React from "react";

export interface WaybillDetailsEmptyProps {
	readonly totalWaybillsCount: number;
	readonly onStartCreateNew: () => void;
}

export const WaybillDetailsEmpty: React.FC<WaybillDetailsEmptyProps> = ({
	totalWaybillsCount, onStartCreateNew,
}) => {
	const isEmpty = totalWaybillsCount === 0;

	return (
		<div
			className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] text-xs gap-2 p-6 text-center"
			data-testid="waybill-details-empty"
		>
			<FileText size={36} className="opacity-40 text-teal-600" />
			<p className="font-semibold text-sm text-[var(--ink)]">
				{isEmpty
					? "Склад пуст — проведите первую приходную накладную"
					: "Выберите накладную из списка или создайте новую"}
			</p>
			<p className="text-[11px] max-w-sm text-[var(--muted)]">
				{isEmpty
					? "После оприходования накладной партии расходников поступят на склад, а мягкий овердрафт процедур автоматически погасится."
					: "Нажмите на накладную слева для просмотра спецификации, печати ТОРГ-12 или выгрузки в CSV."}
			</p>
			{isEmpty && (
				<button
					type="button"
					onClick={onStartCreateNew}
					className="primary-button mt-2 h-8 px-4 text-xs font-semibold gap-1.5"
					data-testid="btn-details-empty-create-wb"
				>
					<Plus size={13} />
					<span>Оприходовать накладную</span>
				</button>
			)}
		</div>
	);
};

export default WaybillDetailsEmpty;
