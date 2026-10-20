import type React from "react";
import { Scan } from "lucide-react";

export interface MdlpScannerInputProps {
	readonly scannerInputId: string;
	readonly inputRef: React.RefObject<HTMLInputElement | null>;
	readonly barcodeInput: string;
	readonly onChangeBarcodeInput: (value: string) => void;
	readonly onScanSubmit: (e?: React.FormEvent) => void;
}

export const MdlpScannerInput: React.FC<MdlpScannerInputProps> = ({
	scannerInputId,
	inputRef,
	barcodeInput,
	onChangeBarcodeInput,
	onScanSubmit,
}) => {
	return (
		<div className="mdlp-scanner-box">
			<form onSubmit={onScanSubmit} className="mdlp-scanner-row">
				<label htmlFor={scannerInputId} className="sr-only">
					Поле 2D-сканера Честный ЗНАК DataMatrix
				</label>
				<input
					id={scannerInputId}
					ref={inputRef}
					type="text"
					value={barcodeInput}
					onChange={(e) => onChangeBarcodeInput(e.target.value)}
					placeholder="Отсканируйте 2D DataMatrix код маркировки или вставьте строку (01...21...)"
					className="mdlp-scanner-input"
					data-testid="mdlp-scanner-input"
					autoComplete="off"
					spellCheck="false"
				/>
				<button
					type="submit"
					className="mdlp-action-btn"
					data-testid="mdlp-scan-submit-btn"
					title={barcodeInput.trim() ? "Добавить отсканированный код" : "Поднесите 2D-сканер к коду DataMatrix на упаковке"}
				>
					<Scan className="w-4 h-4" />
					<span>Добавить</span>
				</button>
			</form>
		</div>
	);
};
