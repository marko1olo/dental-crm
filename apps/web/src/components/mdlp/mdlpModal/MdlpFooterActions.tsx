import type React from "react";
import { Clock, FileCode2, PackageCheck, ShieldCheck, Trash2 } from "lucide-react";
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
		<footer className="mdlp-footer">
			<div className="mdlp-footer-info">
				<span>Документ:</span>
				<input
					type="text" value={docNum} onChange={(e) => onChangeDocNum(e.target.value)}
					className="px-2.5 py-1 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					style={{ width: 190 }} placeholder="Номер документа" data-testid="mdlp-doc-num-input"
				/>
				<span>от</span>
				<input
					type="date" value={docDate} onChange={(e) => onChangeDocDate(e.target.value)}
					className="px-2 py-1 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
					data-testid="mdlp-doc-date-input"
				/>
				<div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--muted)] border-l border-[var(--line)] pl-3 ml-2" title="Фиксация выбытия маркированных препаратов">
					<ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
					<span>Учет медикаментов</span>
				</div>
			</div>

			<div className="mdlp-footer-actions">
				<button
					type="button" onClick={handleClearClick} className="mdlp-action-btn danger text-xs" style={{ height: 38 }}
					data-testid="mdlp-clear-all-btn" title="Очистить список сканирования"
				>
					<Trash2 className="w-3.5 h-3.5" />
					<span>Очистить</span>
				</button>

				<button
					type="button" onClick={onDeferredDisposal} className="mdlp-action-btn secondary text-xs font-bold" style={{ height: 38 }}
					data-testid="mdlp-footer-deferred-btn" title="Лекарство выдается врачу немедленно, пакет выбытия встает в фоновую очередь на отправку"
				>
					<Clock className="w-3.5 h-3.5 text-cyan-400" />
					<span>Отложить в буфер</span>
				</button>

				<button
					type="button" onClick={handleGenerateXmlClick} className="mdlp-action-btn secondary text-xs font-bold" style={{ height: 38 }}
					data-testid="mdlp-generate-xml-btn" title="Сформировать XML документ для маркировки"
				>
					<FileCode2 className="w-4 h-4" />
					<span>Экспорт XML</span>
				</button>

				{/* Мандат 8am: Ровно ОДНА Primary CTA кнопка «✓ Подтвердить списание», изумрудный цвет DENTE */}
				<button
					type="button" onClick={() => onConfirmDisposal?.()} className="mdlp-action-btn primary-cta text-xs font-bold" style={{ height: 38 }}
					data-testid="mdlp-confirm-disposal-primary-cta" title="Подтвердить списание медикаментов"
				>
					<PackageCheck className="w-4 h-4" />
					<span>✓ Подтвердить списание</span>
				</button>
			</div>
		</footer>
	);
};
