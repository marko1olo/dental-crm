import React from "react";

interface Props {
	printerModel: string;
	labelSize: string;
	onPrinterModelChange: (model: string) => void;
	onLabelSizeChange: (size: string) => void;
}

export const PrinterModelConfig: React.FC<Props> = ({
	printerModel,
	labelSize,
	onPrinterModelChange,
	onLabelSizeChange,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				gap: "12px",
			}}
		>
			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Модель термопринтера</span>
				</label>
				<select
					className="hw-field-select"
					value={printerModel}
					onChange={(e) => onPrinterModelChange(e.target.value)}
				>
					<option value="xprinter_365">Xprinter XP-365B (TSPL / USB / LAN)</option>
					<option value="godex_g500">Godex G500 / EZ120 (GEPL / USB)</option>
					<option value="tsc_te200">TSC TE200 / TDP-225 (TSPL / USB)</option>
					<option value="zebra_zd220">Zebra ZD220 / GK420t (ZPL)</option>
					<option value="windows_system">Системный драйвер печати Windows</option>
				</select>
			</div>

			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Формат самоклеящейся ленты</span>
				</label>
				<select
					className="hw-field-select"
					value={labelSize}
					onChange={(e) => onLabelSizeChange(e.target.value)}
				>
					<option value="58x40">58 × 40 мм (Стандартная маркировка)</option>
					<option value="43x25">43 × 25 мм (Компактная для пробирок PRP)</option>
					<option value="58x60">58 × 60 мм (Расширенная для ЦСО)</option>
				</select>
			</div>
		</div>
	);
};
