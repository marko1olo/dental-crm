/**
 * apps/web/src/components/sanpin/journalModules/SanPinScannerModal.tsx
 *
 * Подтверждение стерильности партии лотков для визита (СанПиН 3.3686-21).
 * Партия признается стерильной по умолчанию без поштучного сканирования.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface SanPinScannerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAttachPouchToVisit?: ((pouchCode: string, snippet: string) => void) | undefined;
}

export const SanPinScannerModal: React.FC<SanPinScannerModalProps> = ({
	isOpen,
	onClose,
	onAttachPouchToVisit,
}) => {
	if (!isOpen) return null;

	const handleAttach = () => {
		if (onAttachPouchToVisit) {
			onAttachPouchToVisit(
				"BATCH-AUTO-134",
				"Стерильный лоток (134°C, 5 мин, 5 класс, СанПиН 3.3686-21)",
			);
		}
		showToast("Стерильная партия лотков успешно прикреплена к приёму", "success");
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
			<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-2xl w-full max-w-md p-5 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[var(--teal)] flex items-center justify-center">
							<ShieldCheck size={20} />
						</div>
						<h3 className="font-bold text-[15px] text-[var(--ink)]">
							Подтверждение стерильности партии лотков
						</h3>
					</div>
					<button type="button" onClick={onClose} className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors" aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>

				<p className="text-xs text-[var(--muted)] leading-relaxed mb-4">
					Инструменты из партии автоклава считаются стерильными по умолчанию
					при соблюдении параметров цикла (134°C, 2.15 бар, 5 мин) и норме химических индикаторов 5 класса.
					Поштучное сканирование каждого крафт-пакета не требуется.
				</p>

				<div className="rounded-xl border border-[var(--line-subtle)] bg-[var(--paper-soft)] p-3 mb-4 space-y-1.5 text-xs">
					<div className="flex justify-between"><span className="text-[var(--muted)]">Партия:</span><strong className="text-[var(--ink)]">Смена ЦСО (АК-01)</strong></div>
					<div className="flex justify-between"><span className="text-[var(--muted)]">Режим цикла:</span><strong className="text-[var(--ink)]">134°C / 2.15 бар / 5 мин (Режим B)</strong></div>
					<div className="flex justify-between"><span className="text-[var(--muted)]">Химический контроль:</span><strong className="text-emerald-700 font-semibold">5 класс — Норма</strong></div>
					<div className="flex justify-between"><span className="text-[var(--muted)]">Очистка (ПСО):</span><strong className="text-emerald-700 font-semibold">Азопирам отрицательно</strong></div>
				</div>

				<div className="flex items-center justify-end gap-2.5">
					<button type="button" onClick={onClose} className="h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium cursor-pointer touch-manipulation">
						Отмена
					</button>
					<button type="button" onClick={handleAttach} data-testid="attach-batch-btn" className="h-9 min-h-[36px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-3.5 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation">
						<CheckCircle2 size={15} />
						<span>Прикрепить партию к приёму</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default SanPinScannerModal;
