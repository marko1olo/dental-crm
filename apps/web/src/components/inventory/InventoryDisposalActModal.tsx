/**
 * InventoryDisposalActModal.tsx
 * DENTE Dental CRM — Модальное окно утверждения акта утилизации просроченных ТМЦ.
 * Регламент СанПиН 3.3686-21 (Класс Б / Класс Г), Мандаты 8e, 8n, 8v.
 */

import { FileText, Trash2 } from "lucide-react";
import React from "react";
import type { InventoryItem } from "./inventoryDataMappers.js";

export interface InventoryDisposalActModalProps {
	readonly item: InventoryItem | null;
	readonly quantity: number;
	readonly onClose: () => void;
	readonly onConfirm: (item: InventoryItem) => void;
}

export const InventoryDisposalActModal: React.FC<InventoryDisposalActModalProps> = ({
	item,
	quantity,
	onClose,
	onConfirm,
}) => {
	if (!item) return null;

	return (
		<div
			className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="disposal-act-title"
		>
			<div className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
				<div className="flex items-start gap-3">
					<div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
						<Trash2 size={20} />
					</div>
					<div className="min-w-0 flex-1">
						<h3
							id="disposal-act-title"
							className="text-base font-black leading-tight text-rose-700 dark:text-rose-300"
						>
							Акт утилизации по СанПиН 3.3686-21
						</h3>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							Оформление акта списания просроченных медицинских изделий и препаратов (Класс Б / Класс Г).
						</p>
					</div>
				</div>

				<div className="p-3.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs space-y-1.5">
					<div>
						<span className="text-[var(--muted)]">Материал:</span>{" "}
						<strong className="text-[var(--ink)] font-bold">{item.name}</strong>
					</div>
					{item.lotNumber && (
						<div>
							<span className="text-[var(--muted)]">Партия/Серия:</span>{" "}
							<span className="font-mono font-semibold">{item.lotNumber}</span>
						</div>
					)}
					<div>
						<span className="text-[var(--muted)]">Истекший срок годности:</span>{" "}
						<span className="text-rose-600 dark:text-rose-400 font-bold">
							{item.expirationDate || "Просрочено"}
						</span>
					</div>
					<div>
						<span className="text-[var(--muted)]">Количество к утилизации:</span>{" "}
						<span className="font-bold">
							{quantity} {item.unit || "шт."}
						</span>
					</div>
					<div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20 mt-2">
						Медицинский отпуск пациентам заблокирован. Материал передается на уничтожение специализированной организации по договору утилизации медотходов.
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
					<button
						type="button"
						onClick={onClose}
						className="h-9 px-4 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={() => onConfirm(item)}
						className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-98"
						data-testid="confirm-sanpin-disposal-act-btn"
					>
						<FileText size={14} />
						<span>Утвердить акт утилизации</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default InventoryDisposalActModal;
