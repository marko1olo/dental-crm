import { CheckCircle2, ShoppingCart } from "lucide-react";
import React from "react";

export interface SeniorNurseDisposalSanpinBannerProps {
	readonly paperJournalAcknowledged: boolean;
	readonly onTogglePaperJournal: (acknowledged: boolean) => void;
	readonly hasPurchaseOrder: boolean;
	readonly onOpenPoModal: () => void;
}

export const SeniorNurseDisposalSanpinBanner: React.FC<SeniorNurseDisposalSanpinBannerProps> = ({
	paperJournalAcknowledged,
	onTogglePaperJournal,
	hasPurchaseOrder,
	onOpenPoModal,
}) => {
	return (
		<div
			className={`p-3 rounded-xl border flex items-center justify-between gap-3 flex-wrap ${
				paperJournalAcknowledged
					? "bg-[var(--success-soft)] border-[var(--success-line)]"
					: "bg-[var(--warning-soft)] border-[var(--warning-line)]"
			}`}
		>
			<div className="flex items-center gap-2.5">
				<CheckCircle2
					size={20}
					className={paperJournalAcknowledged ? "text-[var(--success-ink)] shrink-0" : "text-[var(--warning-ink)] shrink-0"}
				/>
				<div>
					<div className="text-xs font-bold text-[var(--ink)]">
						{paperJournalAcknowledged
							? "Бумажный журнал учтён • Медсестра ЦСО не требуется"
							: "СанПиН 3.3686-21: Контроль неснижаемого остатка медикаментов"}
					</div>
					<div className="text-[11px] text-[var(--muted)]">
						{paperJournalAcknowledged
							? "Медсестра ведёт локальный бумажный журнал или отсутствует. Акт списания утверждается дежурным врачом или администратором без комиссий."
							: "При списании зафиксировано достижение порога остатков. Рекомендуется оперативное пополнение."}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<label
					className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] rounded-lg px-2.5 py-1.5 cursor-pointer select-none"
					title="Отметьте, если учёт карпул ведётся в физическом бумажном журнале отделения"
				>
					<input
						type="checkbox"
						checked={paperJournalAcknowledged}
						onChange={(e) => onTogglePaperJournal(e.target.checked)}
						className="rounded border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)] h-4 w-4"
					/>
					<span>Бумажный журнал учтён</span>
				</label>

				{hasPurchaseOrder && (
					<button
						type="button"
						className="h-8 px-3 rounded-lg text-xs font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center gap-1.5"
						onClick={onOpenPoModal}
					>
						<ShoppingCart size={14} />
						Заказ поставщику
					</button>
				)}
			</div>
		</div>
	);
};

export default SeniorNurseDisposalSanpinBanner;
