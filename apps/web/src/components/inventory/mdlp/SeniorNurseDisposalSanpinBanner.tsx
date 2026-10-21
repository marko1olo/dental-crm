import { CheckCircle2, ShoppingCart } from "lucide-react";
import type React from "react";

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
			style={{
				marginBottom: 12,
				padding: "10px 14px",
				borderRadius: 10,
				background: paperJournalAcknowledged ? "rgba(13, 148, 136, 0.08)" : "rgba(245, 158, 11, 0.08)",
				border: paperJournalAcknowledged ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 12,
				flexWrap: "wrap",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
				<CheckCircle2
					size={20}
					style={{
						color: paperJournalAcknowledged ? "var(--teal, #0d9488)" : "var(--warn-fg, #d97706)",
						flexShrink: 0,
					}}
				/>
				<div>
					<div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
						{paperJournalAcknowledged
							? "Бумажный журнал учтён • Медсестра ЦСО не требуется"
							: "СанПиН 3.3686-21: Контроль неснижаемого остатка медикаментов"}
					</div>
					<div style={{ fontSize: 12, color: "var(--muted)" }}>
						{paperJournalAcknowledged
							? "Медсестра ведёт локальный бумажный журнал или отсутствует. Акт списания утверждается дежурным врачом или администратором без комиссий."
							: "При списании зафиксировано достижение порога остатков. Рекомендуется оперативное пополнение."}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<label
					className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-100/70 border border-teal-300 rounded px-2.5 py-1.5 cursor-pointer select-none"
					title="Отметьте, если учёт карпул ведётся в физическом бумажном журнале отделения (старшая медсестра в CRM опциональна)"
				>
					<input
						type="checkbox"
						checked={paperJournalAcknowledged}
						onChange={(e) => onTogglePaperJournal(e.target.checked)}
						className="rounded border-teal-400 text-teal-600 focus:ring-teal-500 h-4 w-4"
					/>
					<span>Бумажный журнал учтён</span>
				</label>

				{hasPurchaseOrder && (
					<button
						type="button"
						className="mdlp-btn mdlp-btn-primary"
						style={{ fontSize: 12, padding: "6px 12px" }}
						onClick={onOpenPoModal}
					>
						<ShoppingCart size={15} />
						Заказ поставщику
					</button>
				)}
			</div>
		</div>
	);
};
