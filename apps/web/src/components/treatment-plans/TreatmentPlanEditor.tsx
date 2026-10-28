/**
 * TreatmentPlanEditor.tsx — Канонический редактор этапов и услуг плана лечения (SSOT).
 * Мандат 8e: Автономия врача — кнопки не блокируются, скидки до 100%, авторасчёт в рублях и копейках.
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal).
 * Apple HIG: Сенсорная зона >= 44px, карточный стек на смартфонах.
 * Мандат 8b: Золотой стандарт (250–350 строк).
 */

import React, { useState, useCallback, useMemo } from "react";
import {
	Plus,
	Trash2,
	User,
	Sparkles,
	ChevronDown,
	ChevronUp,
	CheckCircle2,
	Save,
} from "lucide-react";
import type {
	TreatmentPlanStage,
	TreatmentPlanItem,
	TreatmentPlanStageKind,
} from "./treatmentPlanTypes";
import {
	formatRubles,
	romanizeStageNumber,
} from "./treatmentPlanTypes";

export interface TreatmentPlanEditorProps {
	readonly initialStages?: readonly TreatmentPlanStage[];
	readonly onSavePlan?: (stages: readonly TreatmentPlanStage[], totalRub: number) => void;
	readonly onApprovePlan?: (stages: readonly TreatmentPlanStage[], totalRub: number) => void;
	readonly doctorDiscountPercent?: number;
	readonly onDiscountChange?: (discountPercent: number) => void;
	readonly className?: string;
}

const DEFAULT_STAGE_KINDS: { kind: TreatmentPlanStageKind; title: string; goal: string }[] = [
	{ kind: "stage_1_therapy", title: "Терапевтический этап", goal: "Санация полости рта и купирование воспаления" },
	{ kind: "stage_2_surgery", title: "Хирургический этап", goal: "Удаление безнадежных зубов и установка имплантатов" },
	{ kind: "stage_3_orthopedics", title: "Ортопедический этап", goal: "Постоянное протезирование и восстановление окклюзии" },
];

export const TreatmentPlanEditor: React.FC<TreatmentPlanEditorProps> = ({
	initialStages,
	onSavePlan,
	onApprovePlan,
	doctorDiscountPercent = 0,
	onDiscountChange,
	className = "",
}) => {
	const [stages, setStages] = useState<TreatmentPlanStage[]>(() => {
		if (initialStages && initialStages.length > 0) {
			return [...initialStages];
		}
		return [
			{
				id: "stage-1",
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Терапевтический этап",
				subtitle: "Санация и гигиена",
				clinicalGoal: "Устранение кариеса и очагов воспаления",
				status: "in_progress",
				totalRub: 14500,
				totalKopecks: 1450000,
				estimatedVisits: 2,
				estimatedWeeks: 1,
				items: [
					{
						id: "item-1",
						toothNumber: 16,
						code804n: "A16.07.002",
						name: "Восстановление зуба пломбой (световая полимеризация)",
						category: "Терапия",
						unitPriceRub: 5500,
						priceRub: 5500,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
					{
						id: "item-2",
						toothNumber: 26,
						code804n: "A16.07.030",
						name: "Инструментальная и медикаментозная обработка корневого канала",
						category: "Эндодонтия",
						unitPriceRub: 9000,
						priceRub: 9000,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
				],
			},
		];
	});

	const [expandedStageId, setExpandedStageId] = useState<string | null>("stage-1");

	// Расчет общих сумм
	const grossTotalRub = useMemo(() => {
		return stages.reduce((acc, st) => acc + (st.totalRub || 0), 0);
	}, [stages]);

	const netTotalRub = useMemo(() => {
		if (!doctorDiscountPercent || doctorDiscountPercent <= 0) return grossTotalRub;
		return Math.max(0, Math.round(grossTotalRub * (1 - doctorDiscountPercent / 100)));
	}, [grossTotalRub, doctorDiscountPercent]);

	// Пересчет суммы этапа
	const recalculateStage = (stage: TreatmentPlanStage): TreatmentPlanStage => {
		const totalRub = stage.items.reduce((acc, it) => {
			const itemTotal = (it.unitPriceRub || 0) * (it.quantity || 1) - (it.discountRub || 0);
			return acc + Math.max(0, itemTotal);
		}, 0);
		return {
			...stage,
			totalRub,
			totalKopecks: totalRub * 100,
		};
	};

	// Добавление этапа
	const handleAddStage = useCallback(() => {
		const nextNum = stages.length + 1;
		const defaultMeta = DEFAULT_STAGE_KINDS[(nextNum - 1) % DEFAULT_STAGE_KINDS.length]!;
		const newStage: TreatmentPlanStage = {
			id: `stage-${Date.now()}`,
			stageNumber: nextNum,
			stageKind: defaultMeta.kind,
			title: `${defaultMeta.title}`,
			subtitle: "Новый клинический этап",
			clinicalGoal: defaultMeta.goal,
			status: "draft",
			totalRub: 0,
			totalKopecks: 0,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			items: [],
		};
		setStages((prev) => [...prev, newStage]);
		setExpandedStageId(newStage.id || null);
	}, [stages.length]);

	// Удаление этапа
	const handleDeleteStage = useCallback((stageId?: string) => {
		if (!stageId) return;
		setStages((prev) => prev.filter((s) => s.id !== stageId));
	}, []);

	// Добавление услуги в этап
	const handleAddItem = useCallback((stageId?: string) => {
		if (!stageId) return;
		setStages((prev) =>
			prev.map((st) => {
				if (st.id !== stageId) return st;
				const newItem: TreatmentPlanItem = {
					id: `item-${Date.now()}`,
					code804n: "A16.07.001",
					name: "Стоматологическая процедура",
					category: "Терапия",
					unitPriceRub: 3500,
					priceRub: 3500,
					discountRub: 0,
					quantity: 1,
					stageKind: st.stageKind,
					isCompleted: false,
				};
				const updated = { ...st, items: [...st.items, newItem] };
				return recalculateStage(updated);
			}),
		);
	}, []);

	// Обновление параметров услуги
	const handleUpdateItem = useCallback(
		(stageId: string, itemId: string, field: keyof TreatmentPlanItem, value: any) => {
			setStages((prev) =>
				prev.map((st) => {
					if (st.id !== stageId) return st;
					const updatedItems = st.items.map((it) => {
						if (it.id !== itemId) return it;
						const updated = { ...it, [field]: value };
						if (field === "unitPriceRub") {
							updated.priceRub = value;
						}
						return updated;
					});
					return recalculateStage({ ...st, items: updatedItems });
				}),
			);
		},
		[],
	);

	// Удаление услуги
	const handleDeleteItem = useCallback((stageId: string, itemId: string) => {
		setStages((prev) =>
			prev.map((st) => {
				if (st.id !== stageId) return st;
				const updatedItems = st.items.filter((it) => it.id !== itemId);
				return recalculateStage({ ...st, items: updatedItems });
			}),
		);
	}, []);

	return (
		<div
			className={`treatment-plan-editor flex flex-col gap-4 w-full bg-[var(--paper)] text-[var(--ink)] ${className}`}
			data-testid="treatment-plan-editor"
		>
			{/* Шапка редактора */}
			<div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)]">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<h3 className="text-base font-bold text-[var(--ink)] m-0">Редактор плана лечения</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							Формирование клинических этапов, услуг и расчет стоимости в копейках
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={handleAddStage}
					className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 transition-all cursor-pointer"
					data-testid="btn-add-stage"
				>
					<Plus className="w-4 h-4 text-[var(--teal)]" />
					<span>Добавить этап</span>
				</button>
			</div>

			{/* Список этапов */}
			<div className="flex flex-col gap-3">
				{stages.map((stage) => {
					const isExpanded = expandedStageId === stage.id;
					return (
						<div
							key={stage.id}
							className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs"
							data-testid={`stage-block-${stage.id}`}
						>
							{/* Заголовок этапа */}
							<div
								onClick={() => setExpandedStageId(isExpanded ? null : (stage.id || null))}
								className="flex items-center justify-between p-3.5 bg-[var(--paper-soft)] cursor-pointer select-none border-b border-[var(--line)]/50"
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/15 text-[var(--teal)] font-black text-sm flex items-center justify-center shrink-0">
										{romanizeStageNumber(stage.stageNumber)}
									</div>
									<div>
										<div className="flex items-center gap-2">
											<h4 className="text-sm font-bold text-[var(--ink)] m-0">{stage.title}</h4>
											<span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--line-subtle)] text-[var(--muted)] font-medium">
												{stage.items.length} услуг
											</span>
										</div>
										<p className="text-xs text-[var(--muted)] m-0 truncate max-w-md">{stage.clinicalGoal}</p>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<span className="text-sm font-black text-[var(--ink)]">
										{formatRubles(stage.totalRub)}
									</span>
									{isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
								</div>
							</div>

							{/* Тело этапа: список услуг */}
							{isExpanded && (
								<div className="p-3.5 space-y-3">
									<div className="overflow-x-auto">
										<table className="w-full text-left text-xs border-collapse">
											<thead>
												<tr className="border-b border-[var(--line)] text-[var(--muted)]">
													<th className="py-2 px-2 font-semibold w-16">Зуб</th>
													<th className="py-2 px-2 font-semibold">Услуга</th>
													<th className="py-2 px-2 font-semibold w-24">Кол-во</th>
													<th className="py-2 px-2 font-semibold w-28">Цена (₽)</th>
													<th className="py-2 px-2 font-semibold w-28">Итого</th>
													<th className="py-2 px-2 font-semibold w-10"></th>
												</tr>
											</thead>
											<tbody>
												{stage.items.map((item) => (
													<tr key={item.id} className="border-b border-[var(--line)]/40 hover:bg-[var(--line-subtle)]/30">
														<td className="py-2 px-2">
															<input
																type="number"
																value={item.toothNumber || ""}
																placeholder="—"
																onChange={(e) => handleUpdateItem(stage.id!, item.id, "toothNumber", e.target.value ? Number(e.target.value) : undefined)}
																className="w-12 px-1.5 py-1 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
															/>
														</td>
														<td className="py-2 px-2">
															<input
																type="text"
																value={item.name}
																onChange={(e) => handleUpdateItem(stage.id!, item.id, "name", e.target.value)}
																className="w-full px-2 py-1 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
															/>
														</td>
														<td className="py-2 px-2">
															<input
																type="number"
																min="1"
																value={item.quantity || 1}
																onChange={(e) => handleUpdateItem(stage.id!, item.id, "quantity", Math.max(1, Number(e.target.value)))}
																className="w-16 px-1.5 py-1 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
															/>
														</td>
														<td className="py-2 px-2">
															<input
																type="number"
																step="100"
																value={item.unitPriceRub || 0}
																onChange={(e) => handleUpdateItem(stage.id!, item.id, "unitPriceRub", Math.max(0, Number(e.target.value)))}
																className="w-24 px-1.5 py-1 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold"
															/>
														</td>
														<td className="py-2 px-2 font-bold text-[var(--ink)] whitespace-nowrap">
															{formatRubles((item.unitPriceRub || 0) * (item.quantity || 1) - (item.discountRub || 0))}
														</td>
														<td className="py-2 px-2 text-right">
															<button
																type="button"
																onClick={() => handleDeleteItem(stage.id!, item.id)}
																className="p-1 rounded text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
																title="Удалить услугу"
															>
																<Trash2 className="w-3.5 h-3.5" />
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>

									<div className="flex items-center justify-between pt-2">
										<button
											type="button"
											onClick={() => handleAddItem(stage.id)}
											className="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer"
										>
											<Plus className="w-3.5 h-3.5 text-[var(--teal)]" />
											<span>Добавить процедуру</span>
										</button>

										<button
											type="button"
											onClick={() => handleDeleteStage(stage.id)}
											className="text-xs text-rose-500 hover:underline cursor-pointer bg-transparent border-0"
										>
											Удалить этап
										</button>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Подвал редактора с расчетом и ровно 1 Primary CTA */}
			<div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex items-center gap-4 flex-wrap">
					<div>
						<span className="text-xs text-[var(--muted)] block">Всего по плану:</span>
						<span className="text-lg font-black text-[var(--ink)]">
							{formatRubles(netTotalRub)}
						</span>
						{doctorDiscountPercent > 0 && (
							<span className="ml-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
								(Скидка {doctorDiscountPercent}%)
							</span>
						)}
					</div>

					{onDiscountChange && (
						<div className="flex items-center gap-1.5 text-xs">
							<span className="text-[var(--muted)]">Скидка врача:</span>
							<input
								type="number"
								min="0"
								max="100"
								value={doctorDiscountPercent}
								onChange={(e) => onDiscountChange(Math.min(100, Math.max(0, Number(e.target.value))))}
								className="w-16 px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold text-xs"
							/>
							<span className="font-bold">%</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					{onSavePlan && (
						<button
							type="button"
							onClick={() => onSavePlan(stages, netTotalRub)}
							className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer"
						>
							<Save className="w-4 h-4 text-[var(--muted)]" />
							<span>Сохранить черновик</span>
						</button>
					)}

					{/* ЕДИНСТВЕННЫЙ PRIMARY CTA КНОПКА БЛОКА */}
					<button
						type="button"
						onClick={() => onApprovePlan ? onApprovePlan(stages, netTotalRub) : onSavePlan?.(stages, netTotalRub)}
						className="primary-button min-h-[44px] w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
						data-testid="btn-approve-plan"
					>
						<CheckCircle2 className="w-4 h-4" />
						<span>Утвердить план лечения</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanEditor;
