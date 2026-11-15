/**
 * @dental/web/components/orthodontics/AlignerTrackingCard.tsx
 *
 * DENTE Dental CRM — Канонический трекинг элайнеров и финансовых траншей рассрочки (Мандаты 8b, 8e, 8am, 8be).
 * Включает:
 * 1. Интерактивный контроль шага X из Y, прогресс-бар, выдача комплектов капп на руки.
 * 2. Клинический контроль IPR (сепарации) и аттачментов.
 * 3. Финансовый график рассрочки элайнеров СТРОГО в копейках (amountKopecks: bigint) без float drift.
 * 4. Apple HIG тач-таргеты >= 44x44px, 0px горизонтального скролла.
 */

import React, { useMemo } from "react";
import { Smile, CheckCircle2, AlertCircle, Clock, CreditCard } from "lucide-react";
import type { AlignerTrackingState } from "./orthodonticsCatalogData";

export interface AlignerInstallmentTranche {
	readonly id: string;
	readonly title: string;
	readonly stepRange: string;
	readonly amountKopecks: bigint;
	readonly status: "paid" | "due_today" | "pending";
	readonly dueDateText: string;
}

export interface AlignerTrackingCardProps {
	readonly tracking: AlignerTrackingState;
	readonly onChange: (updater: (prev: AlignerTrackingState) => AlignerTrackingState) => void;
	readonly onAdvanceStep?: () => void;
	readonly customTranches?: readonly AlignerInstallmentTranche[];
}

function formatKopecksToRub(kopecks: bigint): string {
	const rub = Number(kopecks / 100n);
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(rub);
}

export const AlignerTrackingCard: React.FC<AlignerTrackingCardProps> = ({
	tracking,
	onChange,
	onAdvanceStep,
	customTranches,
}) => {
	const currentStep = tracking.currentStep || 1;
	const totalSteps = tracking.totalSteps || 24;
	const progressPercent = Math.min(100, Math.max(0, Math.round((currentStep / totalSteps) * 100)));

	// Канонический график рассрочки элайнеров (4 транша, строго в копейках)
	const tranches: readonly AlignerInstallmentTranche[] = useMemo(() => {
		if (customTranches && customTranches.length > 0) return customTranches;

		// Базовый пресет ортодонтической рассрочки: 240 000 руб (24 000 000 копеек)
		return [
			{
				id: "tranche_1",
				title: "Транш 1: Диагностика и заказ сетапа",
				stepRange: "Шаги 1–6",
				amountKopecks: 6000000n, // 60 000 руб
				status: "paid",
				dueDateText: "Оплачено при старте",
			},
			{
				id: "tranche_2",
				title: "Транш 2: Выдача партии 1 (шаги 7–12)",
				stepRange: "Шаги 7–12",
				amountKopecks: 6000000n,
				status: currentStep >= 7 ? "paid" : "due_today",
				dueDateText: "При выдаче кап 7–12",
			},
			{
				id: "tranche_3",
				title: "Транш 3: Активация партии 2 (шаги 13–18)",
				stepRange: "Шаги 13–18",
				amountKopecks: 6000000n,
				status: currentStep >= 13 ? "paid" : currentStep >= 7 ? "due_today" : "pending",
				dueDateText: "Плановый визит",
			},
			{
				id: "tranche_4",
				title: "Транш 4: Финишная детализация и ретенция",
				stepRange: "Шаги 19–24",
				amountKopecks: 6000000n,
				status: currentStep >= 19 ? "paid" : "pending",
				dueDateText: "Завершение курса",
			},
		];
	}, [customTranches, currentStep]);

	const totalKopecks = useMemo(() => {
		return tranches.reduce((acc, t) => acc + t.amountKopecks, 0n);
	}, [tranches]);

	const paidKopecks = useMemo(() => {
		return tranches
			.filter((t) => t.status === "paid")
			.reduce((acc, t) => acc + t.amountKopecks, 0n);
	}, [tranches]);

	return (
		<div className="ortho-card" data-testid="aligner-tracking-card">
			{/* Верхняя плашка шага и выдачи */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-subtle,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Smile className="w-4 h-4" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)]">Контроль этапов элайнеров</h4>
						<p className="text-xs text-[var(--ink-muted)]">
							Шаг {currentStep} из {totalSteps} (смена каждые {tracking.wearDaysPerStep || 14} дней)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)]">
						<label htmlFor="aligner-step-input" className="text-xs text-[var(--ink-muted)] font-medium">Шаг:</label>
						<input
							id="aligner-step-input"
							type="number"
							min={0}
							max={totalSteps}
							value={currentStep}
							onChange={(e) => {
								const val = Math.min(totalSteps, Math.max(0, parseInt(e.target.value, 10) || 0));
								onChange((prev) => ({ ...prev, currentStep: val }));
							}}
							className="w-12 text-xs font-bold text-center bg-transparent border-none outline-none text-[var(--ink)]"
						/>
						<span className="text-xs text-[var(--ink-muted)]">/ {totalSteps}</span>
					</div>

					{onAdvanceStep && (
						<button
							type="button"
							onClick={onAdvanceStep}
							className="ortho-touch-button selected whitespace-nowrap"
						>
							+ Выдать следующий шаг
						</button>
					)}
				</div>
			</div>

			{/* Прогресс-бар */}
			<div className="flex flex-col gap-1 pt-1">
				<div className="flex items-center justify-between text-xs">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Общий прогресс курса капп:</span>
					<span className="text-[11px] font-bold text-[var(--teal,#0d9488)]">{progressPercent}%</span>
				</div>
				<div className="ortho-aligner-progress-bar">
					<div className="ortho-aligner-progress-fill" style={{ width: `${progressPercent}%` }} />
				</div>
			</div>

			{/* Параметры выдачи, даты, IPR и аттачментов */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
				<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col justify-between min-h-[56px]">
					<label htmlFor="ortho-issued-sets-input" className="text-[10px] text-[var(--ink-muted)] font-medium">Выдано комплектов</label>
					<div className="flex items-center gap-1.5 mt-0.5">
						<input
							id="ortho-issued-sets-input"
							data-testid="aligner-issued-sets-input"
							type="number"
							min={1}
							max={totalSteps}
							value={tracking.issuedSetsCount || 1}
							onChange={(e) => {
								const val = Math.max(1, parseInt(e.target.value, 10) || 1);
								onChange((prev) => ({ ...prev, issuedSetsCount: val }));
							}}
							className="w-14 text-xs font-bold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] rounded px-1.5 py-0.5 text-center"
						/>
						<span className="text-xs text-[var(--ink-muted)] font-medium">пар</span>
					</div>
				</div>

				<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col justify-between min-h-[56px]">
					<label htmlFor="aligner-next-date" className="text-[10px] text-[var(--ink-muted)] font-medium">Плановая дата визита</label>
					<input
						id="aligner-next-date"
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
					className={`p-2.5 rounded-lg border text-left flex flex-col justify-between min-h-[56px] transition-all cursor-pointer ${
						tracking.iprCompleted
							? "bg-[var(--teal-subtle,rgba(13,148,136,0.15))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)]"
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
					className={`p-2.5 rounded-lg border text-left flex flex-col justify-between min-h-[56px] transition-all cursor-pointer ${
						tracking.attachmentsVerified
							? "bg-[var(--teal-subtle,rgba(13,148,136,0.15))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)]"
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

			{/* График рассрочки и траншей оплаты элайнеров (копейка в копейку) */}
			<div className="pt-2 border-t border-[var(--line)] flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
						<CreditCard className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>График рассрочки оплаты элайнеров</span>
					</div>
					<div className="text-[11px] text-[var(--ink-muted)]">
						Оплачено: <strong className="text-[var(--teal,#0d9488)]">{formatKopecksToRub(paidKopecks)}</strong> из {formatKopecksToRub(totalKopecks)}
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{tranches.map((t) => {
						const isPaid = t.status === "paid";
						const isDue = t.status === "due_today";

						return (
							<div
								key={t.id}
								className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 min-h-[72px] text-xs transition-colors ${
									isPaid
										? "bg-[var(--teal-subtle,rgba(13,148,136,0.08))] border-[var(--teal-line,rgba(13,148,136,0.25))]"
										: isDue
										? "bg-[var(--warning-surface,rgba(245,158,11,0.08))] border-[var(--warning-line,rgba(245,158,11,0.3))]"
										: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--ink-muted)]"
								}`}
							>
								<div className="flex items-center justify-between gap-1">
									<span className="font-semibold text-[var(--ink)] truncate">{t.stepRange}</span>
									{isPaid ? (
										<span className="text-[10px] font-bold text-[var(--teal,#0d9488)] flex items-center gap-0.5">
											<CheckCircle2 className="w-3 h-3" /> Оплачено
										</span>
									) : isDue ? (
										<span className="text-[10px] font-bold text-[var(--warning-ink,#f59e0b)] flex items-center gap-0.5">
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
			</div>
		</div>
	);
};

export default AlignerTrackingCard;
