import type React from "react";
import { Clock, FileCode2, PackageCheck, Printer, ShieldCheck, Trash2 } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface MdlpFooterActionsProps {
	readonly docNum: string;
	readonly docDate: string;
	readonly scannedItemsCount: number;
	readonly onChangeDocNum: (value: string) => void;
	readonly onChangeDocDate: (value: string) => void;
	readonly onClearAll: () => void;
	readonly onDeferredDisposal: () => void;
	readonly onGenerateXml: () => void;
	readonly onConfirmDisposal?: (() => void) | undefined;
	readonly onOpenSeniorNurseAct?: (() => void) | undefined;
}

export const MdlpFooterActions: React.FC<MdlpFooterActionsProps> = ({
	docNum,
	docDate,
	scannedItemsCount,
	onChangeDocNum,
	onChangeDocDate,
	onClearAll,
	onDeferredDisposal,
	onGenerateXml,
	onConfirmDisposal,
	onOpenSeniorNurseAct,
}) => {
	const handleClearClick = () => {
		if (scannedItemsCount === 0) {
			showToast("Список отсканированных упаковок уже пуст", "info");
			return;
		}
		onClearAll();
	};

	const handleGenerateXmlClick = () => {
		if (scannedItemsCount === 0) {
			showToast("Добавьте упаковки или используйте пакетное списание", "warning");
			return;
		}
		onGenerateXml();
	};

	return (
		<footer className="border-t border-[var(--line)] bg-[var(--paper-soft)]/50 p-2 sm:px-6 sm:py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
			{/* Левая часть: Номер и дата документа */}
			<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 w-full sm:w-auto">
				<div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
					<span className="text-xs text-[var(--muted)] whitespace-nowrap">Документ:</span>
					<input
						type="text"
						value={docNum}
						onChange={(e) => onChangeDocNum(e.target.value)}
						className="h-8 px-2 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full sm:w-36 focus:border-[var(--primary)] outline-none min-w-0"
						placeholder="Номер документа"
						data-testid="mdlp-doc-num-input"
					/>
				</div>
				<div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
					<span className="text-xs text-[var(--muted)] whitespace-nowrap">от</span>
					<input
						type="date"
						value={docDate}
						onChange={(e) => onChangeDocDate(e.target.value)}
						className="h-8 px-1.5 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full sm:w-32 focus:border-[var(--primary)] outline-none min-w-0"
						data-testid="mdlp-doc-date-input"
					/>
				</div>
				<div className="hidden xl:flex items-center gap-1 text-[11px] text-[var(--muted)] border-l border-[var(--line)] pl-2.5 ml-1" title="Фиксация выбытия маркированных препаратов">
					<ShieldCheck className="w-3.5 h-3.5 text-[var(--primary)]" />
					<span>Учет медикаментов</span>
				</div>
			</div>

			{/* Правая часть: Действия */}
			<div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
				<button
					type="button"
					onClick={handleClearClick}
					className="h-8 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center shrink-0 text-[var(--danger)] hover:bg-[var(--danger-soft)] border border-[var(--danger-soft)] cursor-pointer transition-colors"
					data-testid="mdlp-clear-all-btn"
					title="Очистить список сканирования"
				>
					<Trash2 className="w-3.5 h-3.5 shrink-0" />
					<span className="hidden sm:inline">Очистить</span>
				</button>

				{onOpenSeniorNurseAct && (
					<button
						type="button"
						onClick={onOpenSeniorNurseAct}
						className="h-8 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
						data-testid="print-disposal-act-btn"
						title="Сформировать акт списания для старшей медсестры"
					>
						<Printer className="w-3.5 h-3.5 shrink-0" />
						<span className="hidden sm:inline">Акт списания</span>
						<span className="sm:hidden">Акт</span>
					</button>
				)}

				<button
					type="button"
					onClick={onDeferredDisposal}
					className="h-8 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
					data-testid="mdlp-footer-deferred-btn"
					title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку"
				>
					<Clock className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
					<span className="hidden sm:inline">В буфер</span>
					<span className="sm:hidden">Буфер</span>
				</button>

				<button
					type="button"
					onClick={handleGenerateXmlClick}
					className="h-8 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
					data-testid="mdlp-generate-xml-btn"
					title="Сформировать XML документ для маркировки"
				>
					<FileCode2 className="w-3.5 h-3.5 shrink-0" />
					<span>Экспорт XML</span>
				</button>

				{/* Мандат 8am: Ровно ОДНА Primary CTA кнопка «Вывести из оборота» */}
				<button
					type="button"
					onClick={() => onConfirmDisposal?.()}
					className="h-9 px-3.5 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold gap-2 inline-flex items-center justify-center shrink-0 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm cursor-pointer transition-colors w-full sm:w-auto"
					data-testid="mdlp-confirm-disposal-primary-cta"
					title="Вывести отсканированные упаковки из оборота"
				>
					<PackageCheck className="w-4 h-4 shrink-0" />
					<span>Вывести из оборота</span>
				</button>
			</div>
		</footer>
	);
};
