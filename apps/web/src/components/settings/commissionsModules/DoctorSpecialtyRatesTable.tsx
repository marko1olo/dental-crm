/**
 * DoctorSpecialtyRatesTable.tsx
 *
 * Интерактивная таблица ставок врачей-клиницистов (% от кассы, вычет материалов и ЗТЛ).
 * Поддерживает:
 * - Десктопный вид (>= 640px) с ровной сеткой и кнопками 32px.
 * - Мобильные карточки (< 640px) по стандарту Apple HIG с тач-зоной 44px.
 * - Сохранение всех test-id для полной совместимости с Red Team E2E тестами.
 */

import React from "react";
import {
	formatEffectiveFrom,
	percentLabel,
	type CommissionRate,
	type SaveState,
} from "./staffCommissionsTypes";

export interface DoctorRateRow {
	readonly userId: string;
	readonly name: string;
	readonly rate: CommissionRate | null;
}

export interface DoctorSpecialtyRatesTableProps {
	readonly rows: readonly DoctorRateRow[];
	readonly editingUserId: string | null;
	readonly save: SaveState;
	readonly draft: string;
	readonly draftMaterialDeduction: string;
	readonly draftLabDeduction: string;
	readonly onSetDraft: (val: string) => void;
	readonly onSetDraftMaterial: (val: string) => void;
	readonly onSetDraftLab: (val: string) => void;
	readonly onBeginEdit: (userId: string, rate: CommissionRate | null) => void;
	readonly onCancelEdit: () => void;
	readonly onSaveRate: (userId: string) => Promise<void>;
}

export const DoctorSpecialtyRatesTable: React.FC<DoctorSpecialtyRatesTableProps> = ({
	rows,
	editingUserId,
	save,
	draft,
	draftMaterialDeduction,
	draftLabDeduction,
	onSetDraft,
	onSetDraftMaterial,
	onSetDraftLab,
	onBeginEdit,
	onCancelEdit,
	onSaveRate,
}) => {
	return (
		<>
			{/* Десктопная таблица (>= 640px) */}
			<div
				className="hidden sm:block overflow-x-auto mb-4 rounded-xl border border-[var(--line)] bg-[var(--paper)]"
				style={{
					border: "1px solid var(--line)",
					borderRadius: "12px",
					background: "var(--paper)",
				}}
			>
				<table
					className="w-full text-sm border-collapse"
					data-testid="staff-commissions-table"
				>
					<thead>
						<tr
							className="text-left text-xs text-[var(--ink)] border-b border-[var(--line)] font-bold bg-[var(--paper-soft)]"
							style={{
								borderBottom: "1px solid var(--line)",
								background: "var(--paper-soft, rgba(148, 163, 184, 0.06))",
							}}
						>
							<th scope="col" className="py-2.5 px-3 font-bold">
								Врач-клиницист
							</th>
							<th scope="col" className="py-2.5 px-3 font-bold">
								Ставка (% от кассы)
							</th>
							<th scope="col" className="py-2.5 px-3 font-bold">
								Вычет материалов
							</th>
							<th scope="col" className="py-2.5 px-3 font-bold">
								Вычет ЗТЛ (лаборатория)
							</th>
							<th scope="col" className="py-2.5 px-3 font-bold">
								Действует с
							</th>
							<th scope="col" className="py-2.5 px-3 font-bold text-right">
								Действие
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => {
							const isEditing = editingUserId === row.userId;
							const isSaving = save.kind === "saving" && save.userId === row.userId;
							return (
								<tr
									key={row.userId}
									className="border-b last:border-b-0 border-[var(--line)] hover:bg-[var(--paper-soft)] transition-colors"
									style={{ borderBottom: "1px solid var(--line)" }}
									data-testid={`staff-commission-row-${row.userId}`}
								>
									<td className="py-2.5 px-3 font-semibold text-[var(--ink)]">
										{row.name}
									</td>
									<td className="py-2.5 px-3">
										{isEditing ? (
											<input
												type="text"
												inputMode="decimal"
												value={draft}
												onChange={(e) => onSetDraft(e.target.value)}
												placeholder="0–100"
												aria-label={`Ставка для ${row.name}`}
												className="w-20 px-2.5 py-1 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
												data-testid={`staff-commission-draft-${row.userId}`}
											/>
										) : row.rate ? (
											<span
												className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/20"
												data-testid={`staff-commission-pct-${row.userId}`}
											>
												{percentLabel(row.rate.commissionPct)}
											</span>
										) : (
											<span
												className="text-[var(--muted)] text-xs"
												data-testid={`staff-commission-pct-${row.userId}`}
											>
												не задана
											</span>
										)}
									</td>
									<td className="py-2.5 px-3 text-xs text-[var(--ink)]">
										{isEditing ? (
											<input
												type="text"
												inputMode="decimal"
												value={draftMaterialDeduction}
												onChange={(e) => onSetDraftMaterial(e.target.value)}
												placeholder="0–100"
												aria-label={`Вычет материалов для ${row.name}`}
												className="w-20 px-2.5 py-1 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
												data-testid={`staff-commission-mat-draft-${row.userId}`}
											/>
										) : row.rate ? (
											<span data-testid={`staff-commission-mat-${row.userId}`}>
												{Number(row.rate.materialCostDeductionPct) > 0
													? `Удержание ${percentLabel(row.rate.materialCostDeductionPct)}`
													: "0 % (за счёт клиники)"}
											</span>
										) : (
											<span className="text-[var(--muted)]">—</span>
										)}
									</td>
									<td className="py-2.5 px-3 text-xs text-[var(--ink)]">
										{isEditing ? (
											<input
												type="text"
												inputMode="decimal"
												value={draftLabDeduction}
												onChange={(e) => onSetDraftLab(e.target.value)}
												placeholder="0–100"
												aria-label={`Вычет ЗТЛ для ${row.name}`}
												className="w-20 px-2.5 py-1 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
												data-testid={`staff-commission-lab-draft-${row.userId}`}
											/>
										) : row.rate ? (
											<span data-testid={`staff-commission-lab-${row.userId}`}>
												{Number(row.rate.labCostDeductionPct) > 0
													? `Удержание ${percentLabel(row.rate.labCostDeductionPct)}`
													: "0 % (за счёт клиники)"}
											</span>
										) : (
											<span className="text-[var(--muted)]">—</span>
										)}
									</td>
									<td className="py-2.5 px-3 text-xs text-[var(--muted)]">
										{row.rate?.effectiveFrom
											? formatEffectiveFrom(row.rate.effectiveFrom)
											: "—"}
									</td>
									<td className="py-2.5 px-3 text-right">
										{isEditing ? (
											<div className="flex items-center justify-end gap-2">
												<button
													type="button"
													className="primary-button h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer"
													style={{
														minHeight: "32px",
														padding: "4px 12px",
														borderRadius: "8px",
													}}
													disabled={isSaving}
													onClick={() => void onSaveRate(row.userId)}
													data-testid={`staff-commission-save-${row.userId}`}
												>
													{isSaving ? "…" : "Сохранить"}
												</button>
												<button
													type="button"
													className="secondary-button h-8 px-3 rounded-lg text-xs font-medium cursor-pointer"
													style={{
														minHeight: "32px",
														padding: "4px 12px",
														borderRadius: "8px",
														border: "1px solid var(--line)",
														background: "var(--paper)",
														color: "var(--ink)",
													}}
													disabled={isSaving}
													onClick={onCancelEdit}
												>
													Отмена
												</button>
											</div>
										) : (
											<button
												type="button"
												className="secondary-button h-8 px-3 rounded-lg text-xs font-medium cursor-pointer"
												style={{
													minHeight: "32px",
													padding: "4px 12px",
													borderRadius: "8px",
													border: "1px solid var(--line)",
													background: "var(--paper-soft, rgba(148, 163, 184, 0.08))",
													color: "var(--ink)",
												}}
												onClick={() => onBeginEdit(row.userId, row.rate)}
												data-testid={`staff-commission-edit-${row.userId}`}
											>
												{row.rate ? "Изменить" : "Задать ставку"}
											</button>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Мобильные карточки (< 640px) */}
			<div
				className="flex flex-col gap-2.5 sm:hidden mb-4"
				data-testid="staff-commissions-mobile-cards"
			>
				{rows.map((row) => {
					const isEditing = editingUserId === row.userId;
					const isSaving = save.kind === "saving" && save.userId === row.userId;
					return (
						<div
							key={`mobile-comm-${row.userId}`}
							className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-3 shadow-2xs"
							data-testid={`staff-commission-mobile-card-${row.userId}`}
						>
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<span className="font-bold text-xs text-[var(--ink)] block truncate">
										{row.name}
									</span>
									<span className="text-[11px] text-[var(--muted)] block mt-0.5">
										Действует с: {row.rate?.effectiveFrom ? formatEffectiveFrom(row.rate.effectiveFrom) : "—"}
									</span>
								</div>
								<div className="shrink-0">
									{row.rate ? (
										<span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/20">
											{percentLabel(row.rate.commissionPct)}
										</span>
									) : (
										<span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] text-[var(--muted)]">
											не задана
										</span>
									)}
								</div>
							</div>

							{isEditing ? (
								<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]">
									<div className="grid grid-cols-3 gap-2">
										<label className="flex flex-col gap-1 text-[11px] text-[var(--muted)] font-medium">
											<span>Ставка (%):</span>
											<input
												type="text"
												inputMode="decimal"
												value={draft}
												onChange={(e) => onSetDraft(e.target.value)}
												placeholder="0–100"
												aria-label={`Ставка для ${row.name}`}
												className="min-h-[44px] px-2.5 py-1.5 text-sm rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
											/>
										</label>
										<label className="flex flex-col gap-1 text-[11px] text-[var(--muted)] font-medium">
											<span>Материалы (%):</span>
											<input
												type="text"
												inputMode="decimal"
												value={draftMaterialDeduction}
												onChange={(e) => onSetDraftMaterial(e.target.value)}
												placeholder="0–100"
												aria-label={`Вычет материалов для ${row.name}`}
												className="min-h-[44px] px-2.5 py-1.5 text-sm rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
											/>
										</label>
										<label className="flex flex-col gap-1 text-[11px] text-[var(--muted)] font-medium">
											<span>ЗТЛ (%):</span>
											<input
												type="text"
												inputMode="decimal"
												value={draftLabDeduction}
												onChange={(e) => onSetDraftLab(e.target.value)}
												placeholder="0–100"
												aria-label={`Вычет ЗТЛ для ${row.name}`}
												className="min-h-[44px] px-2.5 py-1.5 text-sm rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
											/>
										</label>
									</div>
									<div className="flex items-center gap-2">
										<button
											type="button"
											className="flex-1 primary-button min-h-[44px] text-xs font-bold inline-flex items-center justify-center gap-1.5"
											disabled={isSaving}
											onClick={() => void onSaveRate(row.userId)}
										>
											{isSaving ? "Сохраняем…" : "Сохранить ставку"}
										</button>
										<button
											type="button"
											className="secondary-button min-h-[44px] px-4 text-xs font-medium"
											disabled={isSaving}
											onClick={onCancelEdit}
										>
											Отмена
										</button>
									</div>
								</div>
							) : (
								<div className="pt-2 border-t border-[var(--line)] flex justify-end">
									<button
										type="button"
										className="secondary-button min-h-[44px] w-full text-xs font-semibold justify-center"
										onClick={() => onBeginEdit(row.userId, row.rate)}
									>
										{row.rate ? "Изменить ставку врача" : "Назначить ставку"}
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
};
