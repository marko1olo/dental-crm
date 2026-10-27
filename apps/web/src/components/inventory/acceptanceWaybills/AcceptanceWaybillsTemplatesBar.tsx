import { Layers, Plus } from "lucide-react";
import type React from "react";
import { CANONICAL_DENTAL_MATERIAL_TEMPLATES, type DentalMaterialTemplate } from "../acceptanceWaybillsEngine.js";

export interface AcceptanceWaybillsTemplatesBarProps {
	readonly onAddFromTemplate: (tmpl: DentalMaterialTemplate) => void;
	readonly onAddEmptyItem: () => void;
	readonly onSortFefo: () => void;
}

export const AcceptanceWaybillsTemplatesBar: React.FC<AcceptanceWaybillsTemplatesBarProps> = ({
	onAddFromTemplate,
	onAddEmptyItem,
	onSortFefo,
}) => {
	return (
		<section className="acceptance-presets-toolbar">
			<span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
				Быстрый выбор:
			</span>
			{CANONICAL_DENTAL_MATERIAL_TEMPLATES.map((tmpl) => (
				<button
					key={tmpl.name}
					type="button"
					className="acceptance-preset-chip"
					onClick={() => onAddFromTemplate(tmpl)}
					title={`Добавить ${tmpl.name} (${tmpl.category}, ставка НДС ${tmpl.vatRate}%)`}
				>
					<Plus size={12} />
					<span>{tmpl.name.split(" ")[0]}</span>
				</button>
			))}
			<button
				type="button"
				className="acceptance-preset-chip acceptance-preset-chip--accent"
				onClick={onAddEmptyItem}
				data-testid="btn-add-empty-line"
			>
				<Plus size={12} />
				<span>+ Своя строка</span>
			</button>
			<button
				type="button"
				className="acceptance-preset-chip"
				onClick={onSortFefo}
				title="Сортировать по FEFO (первыми расходуются партии с наименьшим сроком)"
				data-testid="btn-sort-fefo"
			>
				<Layers size={12} />
				<span>Сортировка FEFO</span>
			</button>
		</section>
	);
};

export default AcceptanceWaybillsTemplatesBar;
