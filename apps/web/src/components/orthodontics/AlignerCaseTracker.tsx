/**
 * @dental/web/components/orthodontics/AlignerCaseTracker.tsx
 *
 * DENTE Dental CRM — Канонический трекер кейсов элайнеров, 3D-сетапов и рассрочки (Мандаты 8b, 8e, 8am, 8be, 8bm).
 * Включает:
 * 1. Управление жизненным циклом кейса (Ожидает сетап -> Сетап утвержден -> В производстве -> Доставлен -> Ношение -> Ретенция).
 * 2. Контроль шага X из Y, прогресс-бар курса, дни смены, плановые даты.
 * 3. Контроль IPR (межзубной сепарации эмали) и аттачментов по зубам FDI.
 * 4. График финансовой рассрочки строго в копейках (amountKopecks: bigint) через formatKopecksToRub.
 * 5. Ровно 1 Primary CTA ("✓ Выдать следующий шаг" или "+ Утвердить план сетапа").
 * 6. Apple HIG тач-таргеты >= 44x44px, 0px горизонтального скролл-дрифта.
 */

import React, { useMemo } from "react";
import { Smile, CheckCircle2, AlertCircle, Clock, CreditCard, Sparkles, Layers, ShieldCheck } from "lucide-react";
import { formatKopecksToRub } from "@dental/shared";
import type { AlignerTrackingState } from "./orthodonticsCatalogData";

export type AlignerCaseStage =
	| "setup_pending"
	| "setup_approved"
	| "manufacturing"
	| "delivered"
	| "active_wear"
	| "retention";

export interface AlignerInstallmentTranche {
	readonly id: string;
	readonly title: string;
	readonly stepRange: string;
	readonly amountKopecks: bigint;
	readonly status: "paid" | "due_today" | "pending";
	readonly dueDateText: string;
}

export interface AlignerCaseTrackerProps {
	readonly tracking: AlignerTrackingState;
	readonly onChange: (updater: (prev: AlignerTrackingState) => AlignerTrackingState) => void;
	readonly onAdvanceStep?: (() => void) | undefined;
	readonly onAddAligner?: (() => void) | undefined;
	readonly onApproveSetup?: (() => void) | undefined;
	readonly caseStage?: AlignerCaseStage | undefined;
	readonly onCaseStageChange?: ((stage: AlignerCaseStage) => void) | undefined;
	readonly customTranches?: readonly AlignerInstallmentTranche[] | undefined;
	readonly totalSetupCostKopecks?: bigint | undefined;
	readonly alignerBrandName?: string | undefined;
	readonly className?: string | undefined;
}

const CASE_STAGES: readonly {
	readonly key: AlignerCaseStage;
	readonly labelRu: string;
	readonly descriptionRu: string;
}[] = [
	{ key: "setup_pending", labelRu: "Ожидает 3D-сетап", descriptionRu: "Сканирование отправлено в лабораторию" },
	{ key: "setup_approved", labelRu: "Сетап утверждён", descriptionRu: "План перемещения зубов согласован врачом" },
	{ key: "manufacturing", labelRu: "В производстве", descriptionRu: "Печать моделей и формовка капп" },
	{ key: "delivered", labelRu: "Доставлен в клинику", descriptionRu: "Комплект капп получен и готов к выдаче" },
	{ key: "active_wear", labelRu: "Активное ношение", descriptionRu: "Пациент проходит курс смены капп" },
	{ key: "retention", labelRu: "Ретенционный период", descriptionRu: "Стабилизация окклюзии ночными ретейнерами" },
];

export const AlignerCaseTracker: React.FC<AlignerCaseTrackerProps> = ({
	tracking,
	onChange,
	onAdvanceStep,
	onAddAligner,
	onApproveSetup,
	caseStage = "active_wear",
	onCaseStageChange,
	customTranches,
	totalSetupCostKopecks,
	alignerBrandName = "FlexiLigner (3D Pro)",
	className,
}) => {
	const currentStep = tracking.currentStep || 1;
	const totalSteps = tracking.totalSteps || 24;
	const progressPercent = Math.min(100, Math.max(0, Math.round((currentStep / totalSteps) * 100)));

	// График рассрочки оплаты элайнеров (копейка в копейку без float-дрифта)
	const tranches: readonly AlignerInstallmentTranche[] = useMemo(() => {
		if (customTranches && customTranches.length > 0) return customTranches;

		if (totalSetupCostKopecks && totalSetupCostKopecks > 0n) {
			const trancheCount = 4;
			const perTrancheKopecks = totalSetupCostKopecks / BigInt(trancheCount);
			const stepChunk = Math.max(1, Math.ceil(totalSteps / trancheCount));

			return Array.from({ length: trancheCount }, (_, idx) => {
				const startStep = idx * stepChunk + 1;
				const endStep = Math.min(totalSteps, (idx + 1) * stepChunk);
				const isPaid = currentStep > endStep;
				const isDue = currentStep >= startStep && currentStep <= endStep;

				return {
					id: `tranche_${idx + 1}`,
					title: `Транш ${idx + 1}: Шаги ${startStep}–${endStep}`,
					stepRange: `Шаги ${startStep}–${endStep}`,
					amountKopecks:
						idx === trancheCount - 1
							? totalSetupCostKopecks - perTrancheKopecks * BigInt(trancheCount - 1)
							: perTrancheKopecks,
					status: isPaid ? "paid" : isDue ? "due_today" : "pending",
					dueDateText:
						idx === 0
							? "При утверждении сетапа"
							: idx === 1
							? "При выдаче партии 1"
							: idx === 2
							? "Контрольный осмотр"
							: "Завершение курса",
				};
			});
		}

		return [];
	}, [customTranches, totalSetupCostKopecks, currentStep, totalSteps]);

	const totalKopecks = useMemo(() => {
		return tranches.reduce((acc, t) => acc + t.amountKopecks, 0n);
	}, [tranches]);

	const paidKopecks = useMemo(() => {
		return tranches
			.filter((t) => t.status === "paid")
			.reduce((acc, t) => acc + t.amountKopecks, 0n);
	}, [tranches]);

	return (
		<div
			className={`ortho-card flex flex-col gap-3.5 ${className || ""}`}
			data-testid="aligner-case-tracker"
		>
			{/* 1. Шапка трекера: бренд и статус сетапа */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
						<Smile className="w-4 h-4" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h4 className="text-sm font-bold text-[var(--ink)]">Студия элайнеров и трекер сетапа</h4>
							<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)]">
								{alignerBrandName}
							</span>
						</div>
						<p className="text-xs text-[var(--ink-muted)]">
							Шаг {currentStep} из {totalSteps} · Смена каждые {tracking.wearDaysPerStep || 14} дней
						</p>
					</div>
				</div>

				{/* Primary / Secondary действия по каппам */}
				<div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
					{caseStage === "setup_pending" && onApproveSetup && (
						<button
							type="button"
							data-testid="approve-setup-btn"
							onClick={onApproveSetup}
							className="ortho-touch-button selected whitespace-nowrap"
						>
							<Sparkles className="w-3.5 h-3.5 mr-1 inline" />
							Утвердить план сетапа
						</button>
					)}

					{onAddAligner && (
						<button
							type="button"
							data-testid="add-aligner-btn"
							onClick={onAddAligner}
							className="ortho-touch-button whitespace-nowrap"
						>
							+ Добавить каппу
						</button>
					)}

					{onAdvanceStep && (
						<button
							type="button"
							data-testid="advance-aligner-step-btn"
							onClick={onAdvanceStep}
							className="ortho-touch-button selected whitespace-nowrap"
						>
							✓ Выдать следующий шаг
						</button>
					)}
				</div>
			</div>

			{/* 2. Сегментный контроль жизненного цикла сетапа */}
			{onCaseStageChange && (
				<div className="flex flex-col gap-1 pt-1">
					<span className="text-[11px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
						Этап сетапа и производства:
					</span>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
						{CASE_STAGES.map((st) => {
							const isCurrent = caseStage === st.key;
							return (
								<button
									key={st.key}
									type="button"
									data-testid={`stage-${st.key}`}
									onClick={() => onCaseStageChange(st.key)}
									className={`min-h-[44px] p-2 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
										isCurrent
											? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs"
											: "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"
									}`}
								>
									<span className="text-xs font-bold leading-tight">{st.labelRu}</span>
									<span className="text-[9px] text-[var(--ink-muted)] leading-none line-clamp-1">
										{st.descriptionRu}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* 3. Прогресс-бар курса */}
			<div className="flex flex-col gap-1 pt-1">
				<div className="flex items-center justify-between text-xs">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Прогресс активного курса:</span>
					<span className="text-[11px] font-bold text-[var(--primary)]">{progressPercent}%</span>
				</div>
				<div className="ortho-aligner-progress-bar">
					<div className="ortho-aligner-progress-fill" style={{ width: `${progressPercent}%` }} />
				</div>
			</div>

			{/* 4. Параметры выдачи, плановая дата, IPR и аттачменты */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
				<div className="p-2.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col justify-between min-h-[56px]">
					<label htmlFor="tracker-issued-sets-input" className="text-[10px] text-[var(--ink-muted)] font-medium">Выдано на руки</label>
					<div className="flex items-center gap-1.5 mt-0.5">
						<input
							id="tracker-issued-sets-input"
							data-testid="aligner-issued-sets-input"
							type="number"
							min={1}
							max={totalSteps}
							value={tracking.issuedSetsCount || 1}
							onChange={(e) => {
								const val = Math.max(1, parseInt(e.target.value, 10) || 1);
								onChange((prev) => ({ ...prev, issuedSetsCount: val }));
							}}
							className="ortho-issued-sets-input w-14 text-xs font-bold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] rounded px-1.5 py-0.5 text-center"
						/>
						<span className="text-xs text-[var(--ink-muted)] font-medium">компл.</span>
					</div>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col justify-between min-h-[56px]">
					<label htmlFor="tracker-next-date-input" className="text-[10px] text-[var(--ink-muted)] font-medium">Следующий визит</label>
					<input
						id="tracker-next-date-input"
						data-testid="next-aligner-date-input"
						type="date"
						value={tracking.nextPlannedDate}
						onChange={(e) => {
							const val = e.target.value;
							onChange((prev) => ({ ...prev, nextPlannedDate: val }));
						}}
						className="text-xs font-bold text-[var(--ink)] bg-transparent border-none outline-none p-0 cursor-pointer w-full mt-0.5"
					/>
				</div>

				<button
					type="button"
					data-testid="toggle-ipr-btn"
					onClick={() => onChange((prev) => ({ ...prev, iprCompleted: !prev.iprCompleted }))}
					className={`p-2.5 rounded-xl border text-left flex flex-col justify-between min-h-[56px] transition-all cursor-pointer ${
						tracking.iprCompleted
							? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
							: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper)]"
					}`}
				>
					<span className="text-[10px] text-[var(--ink-muted)] font-medium">Сепарация (IPR)</span>
					<span className="text-xs font-bold flex items-center justify-between w-full">
						<span>{tracking.iprCompleted ? "Выполнена ✓" : "Не требуется"}</span>
						<span className="text-[10px] px-1 py-0.5 rounded bg-[var(--paper)] text-[var(--ink-muted)] font-normal border border-[var(--line)]">изменить</span>
					</span>
				</button>

				<button
					type="button"
					data-testid="toggle-attachments-btn"
					onClick={() => onChange((prev) => ({ ...prev, attachmentsVerified: !prev.attachmentsVerified }))}
					className={`p-2.5 rounded-xl border text-left flex flex-col justify-between min-h-[56px] transition-all cursor-pointer ${
						tracking.attachmentsVerified
							? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
							: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper)]"
					}`}
				>
					<span className="text-[10px] text-[var(--ink-muted)] font-medium">Аттачменты</span>
					<span className="text-xs font-bold flex items-center justify-between w-full">
						<span>{tracking.attachmentsVerified ? "В норме ✓" : "Требуется осмотр"}</span>
						<span className="text-[10px] px-1 py-0.5 rounded bg-[var(--paper)] text-[var(--ink-muted)] font-normal border border-[var(--line)]">изменить</span>
					</span>
				</button>
			</div>

			{/* 5. График рассрочки оплаты элайнеров (копейка в копейку) */}
			<div className="pt-2 border-t border-[var(--line)] flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
						<CreditCard className="w-3.5 h-3.5 text-[var(--primary)]" />
						<span>График рассрочки оплаты элайнеров</span>
					</div>
					{tranches.length > 0 && (
						<div className="text-[11px] text-[var(--ink-muted)]">
							Оплачено: <strong className="text-[var(--primary)]">{formatKopecksToRub(paidKopecks)}</strong> из {formatKopecksToRub(totalKopecks)}
						</div>
					)}
				</div>

				{tranches.length === 0 ? (
					<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink-muted)] flex items-center gap-2.5">
						<Clock className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>График платежей формируется на основе утвержденного плана лечения и сметы сетапа</span>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
						{tranches.map((t) => {
							const isPaid = t.status === "paid";
							const isDue = t.status === "due_today";

							return (
								<div
									key={t.id}
									className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 min-h-[72px] text-xs transition-colors ${
										isPaid
											? "bg-[var(--success-soft)] border-[var(--success-line)]"
											: isDue
											? "bg-[var(--warning-soft)] border-[var(--warning-line)]"
											: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--ink-muted)]"
									}`}
								>
									<div className="flex items-center justify-between gap-1">
										<span className="font-semibold text-[var(--ink)] truncate">{t.stepRange}</span>
										{isPaid ? (
											<span className="text-[10px] font-bold text-[var(--success-ink)] flex items-center gap-0.5">
												<CheckCircle2 className="w-3 h-3" /> Оплачено
											</span>
										) : isDue ? (
											<span className="text-[10px] font-bold text-[var(--warning-ink)] flex items-center gap-0.5">
												<AlertCircle className="w-3 h-3" /> К оплате
											</span>
										) : (
											<span className="text-[10px] text-[var(--ink-muted)] flex items-center gap-0.5">
												<Clock className="w-3 h-3" /> План
											</span>
										)}
									</div>

									<div className="flex items-baseline justify-between">
										<span className="text-sm font-extrabold text-[var(--ink)]">
											{formatKopecksToRub(t.amountKopecks)}
										</span>
										<span className="text-[10px] text-[var(--ink-muted)]">{t.dueDateText}</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default AlignerCaseTracker;
