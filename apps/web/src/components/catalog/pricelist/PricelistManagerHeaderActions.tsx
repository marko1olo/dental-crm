import {
	Check,
	Download,
	Plus,
	Printer,
	ShieldCheck,
	Upload,
	X,
} from "lucide-react";
import type React from "react";
import type { PricelistManagerHeaderActionsProps } from "./PricelistManagerHeaderActionsProps";

export type { PricelistManagerHeaderActionsProps };

export const PricelistManagerHeaderActions: React.FC<
	PricelistManagerHeaderActionsProps
> = (props) => {
	const {
		onOpenAdd,
		onPrintA4,
		onPrintConsumerStand,
		onExportCsv,
		onOpenImport,
		onSaveAndClose,
		onClose,
	} = props;

	return (
		<div
			className="pricelist-header-actions"
			style={{
				display: "flex",
				alignItems: "center",
				gap: "6px",
				flexWrap: "wrap",
			}}
		>
			<button
				type="button"
				className="pricelist-btn pricelist-btn-primary"
				onClick={onOpenAdd}
				title="Добавить новую услугу в прейскурант"
				style={{
					minHeight: "36px",
					height: "36px",
					gap: "6px",
					padding: "0 0.875rem",
					fontWeight: 600,
				}}
			>
				<Plus size={16} />
				<span>Добавить услугу</span>
			</button>
			<button
				type="button"
				className="pricelist-btn"
				onClick={onPrintA4}
				title="Печать официального прейскуранта (A4)"
				style={{ minHeight: "36px", height: "36px", gap: "6px" }}
			>
				<Printer size={15} />
				<span>Печать A4</span>
			</button>
			<button
				type="button"
				className="pricelist-btn"
				onClick={onPrintConsumerStand}
				title="Печать для стенда «Уголок потребителя»"
				style={{ minHeight: "36px", height: "36px", gap: "6px" }}
			>
				<ShieldCheck size={15} />
				<span>Уголок потребителя</span>
			</button>
			<button
				type="button"
				className="pricelist-btn"
				onClick={onExportCsv}
				title="Экспорт в CSV (Excel UTF-8 BOM)"
				style={{ minHeight: "36px", height: "36px", gap: "6px" }}
			>
				<Download size={15} />
				<span>Экспорт CSV</span>
			</button>
			<button
				type="button"
				className="pricelist-btn"
				onClick={onOpenImport}
				title="Импорт прейскуранта"
				style={{ minHeight: "36px", height: "36px", gap: "6px" }}
			>
				<Upload size={15} />
				<span>Импорт</span>
			</button>
			<button
				type="button"
				className="pricelist-btn pricelist-btn-ok"
				onClick={onSaveAndClose}
				style={{
					minHeight: "36px",
					height: "36px",
					gap: "6px",
					padding: "0 1rem",
					fontWeight: 600,
				}}
			>
				<Check size={16} />
				<span>Сохранить</span>
			</button>
			<button
				type="button"
				className="pricelist-btn pricelist-btn-icon"
				onClick={onClose}
				aria-label="Закрыть"
				style={{ width: "36px", height: "36px", minHeight: "36px" }}
			>
				<X size={18} />
			</button>
		</div>
	);
};
