import {
	Check,
	ChevronDown,
	Download,
	Plus,
	Printer,
	ShieldCheck,
	Upload,
	X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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

	const [isPrintOpen, setIsPrintOpen] = useState(false);
	const [isDataOpen, setIsDataOpen] = useState(false);

	const printRef = useRef<HTMLDivElement>(null);
	const dataRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				printRef.current &&
				!printRef.current.contains(event.target as Node)
			) {
				setIsPrintOpen(false);
			}
			if (
				dataRef.current &&
				!dataRef.current.contains(event.target as Node)
			) {
				setIsDataOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	return (
		<div className="pricelist-header-actions">
			<div className="pricelist-header-actions-primary-row">
				<button
					type="button"
					className="pricelist-btn pricelist-btn-primary"
					onClick={onOpenAdd}
					title="Добавить новую услугу в прейскурант"
				>
					<Plus size={15} />
					<span>Добавить услугу</span>
				</button>
			</div>

			<div className="pricelist-header-actions-secondary-row">
				<div className="pricelist-dropdown-container" ref={printRef}>
					<button
						type="button"
						className={`pricelist-btn ${isPrintOpen ? "pricelist-btn-active" : ""}`}
						onClick={() => {
							setIsPrintOpen((prev) => !prev);
							setIsDataOpen(false);
						}}
						title="Печать официального прейскуранта или стенда"
						aria-expanded={isPrintOpen}
						aria-haspopup="menu"
					>
						<Printer size={15} />
						<span>Печать</span>
						<ChevronDown size={13} style={{ opacity: 0.6 }} />
					</button>

					{isPrintOpen && (
						<div className="pricelist-dropdown-menu" role="menu">
							<button
								type="button"
								className="pricelist-dropdown-item"
								role="menuitem"
								onClick={() => {
									setIsPrintOpen(false);
									onPrintA4();
								}}
							>
								<Printer size={14} />
								<span>Официальный прейскурант (A4)</span>
							</button>
							<button
								type="button"
								className="pricelist-dropdown-item"
								role="menuitem"
								onClick={() => {
									setIsPrintOpen(false);
									onPrintConsumerStand();
								}}
							>
								<ShieldCheck size={14} />
								<span>Стенд «Уголок потребителя»</span>
							</button>
						</div>
					)}
				</div>

				<div className="pricelist-dropdown-container" ref={dataRef}>
					<button
						type="button"
						className={`pricelist-btn ${isDataOpen ? "pricelist-btn-active" : ""}`}
						onClick={() => {
							setIsDataOpen((prev) => !prev);
							setIsPrintOpen(false);
						}}
						title="Экспорт и импорт каталога услуг"
						aria-expanded={isDataOpen}
						aria-haspopup="menu"
					>
						<Download size={15} />
						<span>Экспорт / Импорт</span>
						<ChevronDown size={13} style={{ opacity: 0.6 }} />
					</button>

					{isDataOpen && (
						<div className="pricelist-dropdown-menu" role="menu">
							<button
								type="button"
								className="pricelist-dropdown-item"
								role="menuitem"
								onClick={() => {
									setIsDataOpen(false);
									onExportCsv();
								}}
							>
								<Download size={14} />
								<span>Экспорт в CSV (Excel)</span>
							</button>
							<button
								type="button"
								className="pricelist-dropdown-item"
								role="menuitem"
								onClick={() => {
									setIsDataOpen(false);
									onOpenImport();
								}}
							>
								<Upload size={14} />
								<span>Импорт прейскуранта</span>
							</button>
						</div>
					)}
				</div>

				<button
					type="button"
					className="pricelist-btn pricelist-btn-icon pricelist-close-btn-desktop"
					onClick={onClose}
					aria-label="Закрыть"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
};
