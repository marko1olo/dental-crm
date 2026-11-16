/**
 * apps/web/src/components/catalog/pricelist/PricelistStudioHeader.tsx
 *
 * Шапка канонической студии прейскуранта DENTE CRM.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 150).
 */

import React from "react";
import { Download, Layers, Plus, Printer, Upload, X } from "lucide-react";

export interface PricelistStudioHeaderProps {
	readonly clinicName: string;
	readonly activeItems: number;
	readonly avgMarginPercent: number;
	readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
	readonly onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onPrintA4: () => void;
	readonly onExportCsv: () => void;
	readonly onOpenCreate: () => void;
	readonly onClose: () => void;
}

export const PricelistStudioHeader: React.FC<PricelistStudioHeaderProps> = ({
	clinicName,
	activeItems,
	avgMarginPercent,
	fileInputRef,
	onImportFileChange,
	onPrintA4,
	onExportCsv,
	onOpenCreate,
	onClose,
}) => {
	return (
		<header className="pricelist-studio-header">
			<div className="pricelist-header-brand">
				<div className="pricelist-header-icon-box">
					<Layers size={22} />
				</div>
				<div>
					<h2 className="pricelist-header-title">Прейскурант услуг клиники</h2>
					<div className="pricelist-header-subtitle">
						<span className="hidden sm:inline">{clinicName} · </span>
						{activeItems} активных позиций
						<span className="hidden sm:inline"> · Средняя маржа {avgMarginPercent}%</span>
					</div>
				</div>
			</div>
			<div className="pricelist-header-actions">
				<input
					type="file"
					ref={fileInputRef}
					accept=".csv,.txt"
					style={{ display: "none" }}
					onChange={onImportFileChange}
				/>
				<button
					type="button"
					className="pricelist-btn dente-btn dente-btn-secondary"
					onClick={() => fileInputRef.current?.click()}
					title="Импорт из CSV"
				>
					<Upload size={16} className="text-current shrink-0" />
					<span className="hidden sm:inline">Импорт</span>
				</button>
				<button
					type="button"
					className="pricelist-btn dente-btn dente-btn-secondary"
					onClick={onPrintA4}
					title="Печать официального бланка прейскуранта А4"
				>
					<Printer size={16} className="text-current shrink-0" />
					<span className="hidden sm:inline">Печать A4</span>
				</button>
				<button
					type="button"
					className="pricelist-btn dente-btn dente-btn-secondary"
					onClick={onExportCsv}
					title="Экспорт в CSV"
				>
					<Download size={16} className="text-current shrink-0" />
					<span className="hidden sm:inline">Экспорт</span>
				</button>
				<button
					type="button"
					className="pricelist-btn pricelist-btn-primary dente-btn dente-btn-primary"
					onClick={onOpenCreate}
				>
					<Plus size={16} className="text-current shrink-0" />
					<span>Добавить услугу</span>
				</button>
				<button
					type="button"
					className="pricelist-btn pricelist-btn-icon dente-btn dente-btn-ghost"
					onClick={onClose}
					aria-label="Закрыть"
				>
					<X size={18} className="text-current shrink-0" />
				</button>
			</div>
		</header>
	);
};
