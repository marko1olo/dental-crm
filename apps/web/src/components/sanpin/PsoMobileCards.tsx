import type { PsoCleaningLog } from "@dental/shared";
import { Award, CheckCircle2, FlaskConical, Plus, XCircle } from "lucide-react";
import React from "react";
import { STATUTORY_PSO_REAGENTS } from "./sanpinAzopyramEngine";

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
						Нет записей азопирамовых и фенолфталеиновых проб за выбранный период (СанПиН 3.3686-21, контроль предстерилизационной очистки).
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
			{logs.map((log) => {
				const isApproved = log.isBatchApproved ?? true;
				const isStamped = stampedRows[log.id] || Boolean(log.notes?.includes("ЭЦП"));
				const reagentLot = STATUTORY_PSO_REAGENTS.azopyram.standardLotNumber;
				const rawDate = log.timestamp || log.createdAt;
				const safeDate =
					rawDate && !isNaN(new Date(rawDate).getTime())
						? new Date(rawDate)
						: new Date();

				return (
					<div
						key={log.id}
						className="sanpin-mobile-card touch-manipulation"
						data-testid={`pso-sample-card-${log.id}`}
					>
						{/* Header: Date and Status Badge */}
						<div className="sanpin-mobile-card-header">
							<div className="flex items-baseline gap-2">
								<span className="text-sm font-extrabold text-[var(--ink)] tracking-tight">
									{safeDate.toLocaleDateString("ru-RU", {
										day: "2-digit",
										month: "2-digit",
										year: "numeric",
									})}
								</span>
								<span className="text-xs text-[var(--muted)] font-medium">
									{safeDate.toLocaleTimeString("ru-RU", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							</div>

							<span
								className={`sanpin-tag shrink-0 text-xs font-bold py-1 px-2.5 rounded-lg inline-flex items-center gap-1.5 ${
									isApproved ? "sanpin-tag-success" : "sanpin-tag-error"
								}`}
								title={isApproved ? "Партия допущена (проба отрицательная)" : "Брак очистки (повторная очистка)"}
							>
								{isApproved ? (
									<>
										<CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
										<span>Норма (Отрицательно)</span>
									</>
								) : (
									<>
										<XCircle size={13} className="shrink-0 text-rose-600" />
										<span>БРАК ОЧИСТКИ</span>
									</>
								)}
							</span>
						</div>

						{/* Body: Key Parameters */}
						<div className="sanpin-mobile-card-body">
							<div className="text-xs font-bold text-[var(--ink)] leading-snug">
								{log.instrumentName || "Стоматологический инструментарий"}
							</div>

							<div className="text-xs text-[var(--muted)] flex items-center gap-2">
								<span>Объём партии: <strong className="text-[var(--ink)]">{log.batchItemCount} шт.</strong></span>
								<span>·</span>
								<span>Контроль (1%): <strong className="text-[var(--teal,#0d9488)]">{log.testedSampleCount} шт.</strong></span>
							</div>

							{/* Chips: Azopyram & Phenolphthalein results */}
							<div className="flex flex-wrap items-center gap-1.5 pt-1">
								<span
									className={`sanpin-tag text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
										log.isAzopyramNegative ? "sanpin-tag-success" : "sanpin-tag-error"
									}`}
								>
									{log.isAzopyramNegative ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
									<span>Азопирам (кровь): {log.isAzopyramNegative ? "Отрицательно" : "Положительно"}</span>
								</span>

								<span
									className={`sanpin-tag text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
										log.isPhenolphthaleinNegative ? "sanpin-tag-success" : "sanpin-tag-error"
									}`}
								>
									{log.isPhenolphthaleinNegative ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
									<span>Щёлочь: {log.isPhenolphthaleinNegative ? "Отрицательно" : "Положительно"}</span>
								</span>
							</div>

							{/* Detergent & Reagent lot */}
							<div className="text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line-subtle,#f1f5f9)] dark:border-[#334155]/50 flex flex-wrap justify-between gap-1">
								<span>Моющее: <span className="font-semibold text-[var(--ink)]">{log.detergentBrand || "Биолот 0.5% + Аламинол 1%"}</span></span>
								<span>Реактив: <span className="font-mono font-medium">{reagentLot}</span></span>
							</div>

							{/* Operator & Signature Footer */}
							<div className="flex items-center justify-between pt-2">
								<div className="text-xs text-[var(--muted)]">
									<span>Оператор: </span>
									<span className="font-bold text-[var(--ink)]">{log.operatorName || nurseName}</span>
								</div>

								{isStamped ? (
									<span className="sanpin-tag sanpin-tag-success text-[11px] font-bold py-1 px-2 rounded-md inline-flex items-center gap-1">
										<CheckCircle2 size={12} />
										<span>ЭЦП</span>
									</span>
								) : (
									<button
										type="button"
										onClick={() => onStampVerification(log.id)}
										className="sanpin-btn sanpin-btn-secondary min-h-[44px] h-11 text-xs font-bold px-3 rounded-xl inline-flex items-center gap-1.5 touch-manipulation cursor-pointer"
										title="Заверить пробу электронной подписью ответственного"
									>
										<Award size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
										<span>Заверить (ЭЦП)</span>
									</button>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
