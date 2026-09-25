import {
	MDLP_OPERATION_CODES,
	type Gs1DataMatrixParseResult,
	type MdlpOperationCode,
} from "@dental/shared";
import { AlertTriangle, Plus, QrCode, ShieldCheck } from "lucide-react";
import type React from "react";

export interface MdlpScannerCardProps {
	readonly operationCode: MdlpOperationCode;
	readonly onSelectOperationCode: (code: MdlpOperationCode) => void;
	readonly scannerAutoMode: boolean;
	readonly onToggleScannerAutoMode: (val: boolean) => void;
	readonly barcodeInput: string;
	readonly onScannerInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onScannerPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
	readonly onBarcodeInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	readonly onAddBarcode: (code: string) => void;
	readonly scannerInputRef: React.RefObject<HTMLInputElement | null>;
	readonly lastScanned: Gs1DataMatrixParseResult | null;
}

export const MdlpScannerCard: React.FC<MdlpScannerCardProps> = ({
	operationCode,
	onSelectOperationCode,
	scannerAutoMode,
	onToggleScannerAutoMode,
	barcodeInput,
	onScannerInputChange,
	onScannerPaste,
	onBarcodeInputKeyDown,
	onAddBarcode,
	scannerInputRef,
	lastScanned,
}) => {
	return (
		<div className="mdlp-scanner-card">
			{/* Переключатель кода операции МДЛП: 332 (Медпомощь) vs 331 (Списание / уничтожение / брак) */}
			<div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-line/60">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-ink">Операция МДЛП:</span>
					<div className="inline-flex rounded-lg border border-line bg-paper-soft p-0.5">
						<button
							type="button"
							className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
								operationCode === MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE
									? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
									: "text-muted hover:text-ink"
							}`}
							onClick={() => onSelectOperationCode(MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE)}
							data-testid="op-code-332-btn"
							title="Код 332: Производственное использование анестетиков в лечебных целях у стоматологического кресла (Схема 10560)"
						>
							Код 332 (Медпомощь)
						</button>
						<button
							type="button"
							className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
								operationCode === MDLP_OPERATION_CODES.DISPOSAL_WRITE_OFF_OR_DEFECT
									? "bg-[var(--bad-fg,#dc2626)] text-white shadow-sm"
									: "text-muted hover:text-ink"
							}`}
							onClick={() => onSelectOperationCode(MDLP_OPERATION_CODES.DISPOSAL_WRITE_OFF_OR_DEFECT)}
							data-testid="op-code-331-btn"
							title="Код 331: Выбытие по причине боя, нарушения герметичности, брака или истечения срока годности (Схема 10560)"
						>
							Код 331 (Бой / брак / утиль)
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2 text-xs text-muted">
					<label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px]">
						<input
							type="checkbox"
							checked={scannerAutoMode}
							onChange={(e) => onToggleScannerAutoMode(e.target.checked)}
							className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
						/>
						<span className="font-medium text-ink">Авторазбор 2D</span>
					</label>
					<span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
						2D-сканер активен
					</span>
				</div>
			</div>

			{/* Заголовок секции сканирования */}
			<div className="flex flex-wrap items-center justify-between gap-2 mt-2">
				<span className="text-xs font-bold text-ink flex items-center gap-1.5">
					<QrCode size={18} className="text-teal-600" />
					<span>Сканирование 2D DataMatrix (Честный ЗНАК / GS1):</span>
				</span>
			</div>

			{/* Поле прямого ввода со сканера 2D штрихкодов с поддержкой горячего ввода на лету */}
			<div className="mdlp-input-group">
				<input
					ref={scannerInputRef}
					type="text"
					placeholder="Отсканируйте 2D DataMatrix пистолетом-сканером или вставьте строку маркировки..."
					value={barcodeInput}
					onChange={onScannerInputChange}
					onPaste={onScannerPaste}
					onKeyDown={onBarcodeInputKeyDown}
					className="mdlp-scanner-input"
					autoFocus
				/>
				<button
					type="button"
					className="mdlp-btn mdlp-btn-primary min-h-[44px]"
					style={{ minHeight: "44px" }}
					onClick={() => onAddBarcode(barcodeInput)}
					disabled={false}
					data-testid="add-barcode-btn"
				>
					<Plus size={16} /> Добавить
				</button>
			</div>

			{/* Карточка последнего распознанного препарата */}
			{lastScanned && (
				<div
					className={`p-3 rounded-lg border text-xs flex flex-col gap-1.5 ${
						lastScanned.isValid
							? "bg-teal-50/70 border-teal-200 text-teal-950"
							: "bg-red-50 border-red-200 text-red-950"
					}`}
				>
					<div className="flex items-center justify-between font-bold">
						<div className="flex items-center gap-2">
							{lastScanned.isValid ? (
								<ShieldCheck size={16} className="text-teal-600" />
							) : (
								<AlertTriangle size={16} className="text-bad-fg" />
							)}
							<span>
								{lastScanned.recognizedDrug?.tradeName ??
									(lastScanned.isValid
										? "Медикамент опознан"
										: "Ошибка структуры штрихкода")}
							</span>
						</div>
						<div className="font-mono text-[11px] text-muted">
							GTIN: {lastScanned.gtin || "—"} • SN:{" "}
							{lastScanned.serialNumber || "—"}
						</div>
					</div>

					{lastScanned.recognizedDrug && (
						<div className="mdlp-drug-badges mt-1">
							<span className="mdlp-badge mdlp-badge-teal">
								{lastScanned.recognizedDrug.inn}
							</span>
							<span className="mdlp-badge mdlp-badge-blue">
								Концентрация:{" "}
								{lastScanned.recognizedDrug.concentrationPct}%
							</span>
							<span className="mdlp-badge mdlp-badge-teal">
								Вазоконстриктор:{" "}
								{lastScanned.recognizedDrug.vasoconstrictorName}
							</span>
							<span className="mdlp-badge mdlp-badge-blue">
								{lastScanned.recognizedDrug.dosageForm}
							</span>
							<span className="mdlp-badge mdlp-badge-teal">
								{lastScanned.recognizedDrug.manufacturer}
							</span>
						</div>
					)}

					{lastScanned.errors.length > 0 && (
						<div className="text-bad-fg font-semibold mt-1">
							{lastScanned.errors.join("; ")}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
