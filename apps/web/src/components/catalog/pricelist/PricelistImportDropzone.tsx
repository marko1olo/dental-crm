import { FileSpreadsheet } from "lucide-react";
import React from "react";

export interface PricelistImportDropzoneProps {
	readonly importMode: "smart_text" | "csv";
	readonly smartTextInput: string;
	readonly importErrors: readonly string[];
	readonly onSmartTextChange: (val: string) => void;
	readonly onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PricelistImportDropzone: React.FC<
	PricelistImportDropzoneProps
> = ({
	importMode,
	smartTextInput,
	importErrors,
	onSmartTextChange,
	onFileUpload,
}) => {
	return (
		<div className="csv-import-body">
			{importMode === "smart_text" ? (
				<div
					style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
				>
					<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
						Вставьте скопированный текст из старого прейскуранта клиники,
						выгрузки Word или распознанного PDF. Алгоритм автоматически выделит
						цены, очистит наименования и сопоставит услуги с каталогом услуг.
					</div>

					<textarea
						className="pricelist-search-input"
						style={{
							height: "140px",
							fontFamily: "monospace",
							fontSize: "0.75rem",
							padding: "0.5rem",
							lineHeight: "1.4",
						}}
						placeholder={`Пример строк для вставки:\nA16.07.002.001 Наложение световой пломбы Filtek Z250 4 500 руб\nЛечение глубокого кариеса - 3500\nУдаление зуба мудрости сложное 5 200 ₽\nУстановка имплантата Straumann SLA 38000\nКоронка из диоксида циркония 18000 руб\nАнестезия Убистезин 700 р`}
						value={smartTextInput}
						onChange={(e) => onSmartTextChange(e.target.value)}
					/>

					<label
						className="csv-dropzone"
						style={{ padding: "0.75rem", marginTop: "0.25rem" }}
					>
						<FileSpreadsheet size={24} style={{ color: "var(--brand-500)" }} />
						<div style={{ fontSize: "0.75rem", fontWeight: 600 }}>
							Загрузить файл прейскуранта (TXT, CSV, PDF выгрузка)
						</div>
						<input
							type="file"
							accept=".txt,.csv,.doc,.docx"
							style={{ display: "none" }}
							onChange={onFileUpload}
						/>
					</label>
				</div>
			) : (
				<div>
					<label className="csv-dropzone">
						<FileSpreadsheet size={36} style={{ color: "var(--brand-500)" }} />
						<div style={{ fontWeight: 600 }}>
							Выберите или перетащите CSV-файл прейскуранта
						</div>
						<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
							Поддерживается разделитель точка с запятой (;) или запятая (,),
							кодировка UTF-8
						</div>
						<input
							type="file"
							accept=".csv,.txt"
							style={{ display: "none" }}
							onChange={onFileUpload}
						/>
					</label>

					{importErrors.length > 0 && (
						<div className="csv-errors-block" style={{ marginTop: "0.75rem" }}>
							<div
								style={{
									fontWeight: 600,
									color: "var(--alert-fg)",
									fontSize: "0.8125rem",
								}}
							>
								Ошибки в строках CSV:
							</div>
							<ul
								style={{
									margin: "0.25rem 0 0 1rem",
									fontSize: "0.75rem",
									color: "var(--alert-fg)",
								}}
							>
								{importErrors.slice(0, 5).map((err) => (
									<li key={err}>{err}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
