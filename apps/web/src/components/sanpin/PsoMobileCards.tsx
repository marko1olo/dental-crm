import type { PsoCleaningLog } from "@dental/shared";
import { CheckCircle2, FlaskConical } from "lucide-react";
import React from "react";
import { PsoMobileCardItem } from "./PsoMobileCardItem.js";

export interface PsoMobileCardsProps {
	readonly logs: readonly PsoCleaningLog[];
	readonly loading: boolean;
	readonly nurseName: string;
	readonly stampedRows: Record<string, boolean>;
	readonly onStampVerification: (logId: string) => void;
	readonly onQuickMarkNorm: () => void;
	readonly isSubmitting: boolean;
}

export function PsoMobileCards({
	logs,
	loading,
	nurseName,
	stampedRows,
	onStampVerification,
	onQuickMarkNorm,
	isSubmitting,
}: PsoMobileCardsProps) {
	if (loading) {
		return (
			<div className="md:hidden flex flex-col gap-3 p-1.5 text-center text-sm text-[var(--muted)]">
				<div className="sanpin-mobile-card p-6">Загрузка журнала контроля очистки...</div>
			</div>
		);
	}

	if (logs.length === 0) {
		return (
			<div className="md:hidden flex flex-col gap-3 p-1.5" data-testid="pso-mobile-empty-state">
				<div className="sanpin-mobile-card text-center p-5 flex flex-col items-center gap-3">
					<FlaskConical size={34} className="text-[var(--brand-primary,#0284c7)]" />
					<div className="font-bold text-base text-[var(--ink)]">Журнал проверок чистоты пуст</div>
					<p className="text-xs text-[var(--muted)] leading-relaxed">
						Нет записей азопирамовых и фенолфталеиновых проб за выбранный период (контроль очистки инструментов).
					</p>
					<button
						type="button"
						onClick={onQuickMarkNorm}
						aria-busy={isSubmitting}
						className="sanpin-btn sanpin-btn-primary w-full min-h-[48px] h-12 text-sm font-bold flex items-center justify-center gap-2 rounded-xl touch-manipulation cursor-pointer"
						data-testid="pso-mobile-quick-norm-empty-btn"
					>
						<CheckCircle2 size={18} />
						<span>Проба отрицательная (100% норма)</span>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="md:hidden flex flex-col gap-3 p-1.5" data-testid="pso-mobile-cards-container">
			{logs.map((log) => (
				<PsoMobileCardItem
					key={log.id}
					log={log}
					isStamped={Boolean(stampedRows[log.id] || log.notes?.includes("ЭЦП"))}
					nurseName={nurseName}
					onStampVerification={onStampVerification}
				/>
			))}
		</div>
	);
}
