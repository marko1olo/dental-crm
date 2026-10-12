/**
 * StaffCommissionsPanel.tsx
 *
 * Действующие ставки врачей и сдельная мотивация персонала (% от кассы).
 * Фасадный контейнер (строго <= 250 строк, текущий размер ~160 строк).
 *
 * Декомпозирован на подмодули в commissionsModules/:
 * - staffCommissionsTypes.ts: типы ставок, бенчмарки специальностей, утилиты.
 * - useStaffCommissionsState.ts: хук инкапсуляции сетевых вызовов и черновиков.
 * - StaffRoleCommissionCard.tsx: базовые ставки по ключевым ролям персонала.
 * - DoctorSpecialtyRatesTable.tsx: детальная таблица процентов и вычетов врачей (Desktop + Mobile).
 * - MaterialDeductionRulesCard.tsx: прозрачные правила вычета ЗТЛ и материалов.
 * - DoctorMotivationCalculator: интерактивный калькулятор сдельной оплаты.
 */

import { Percent } from "lucide-react";
import type React from "react";
import { DoctorMotivationCalculator } from "./commissions/DoctorMotivationCalculator";
import { DoctorSpecialtyRatesTable } from "./commissionsModules/DoctorSpecialtyRatesTable";
import { MaterialDeductionRulesCard } from "./commissionsModules/MaterialDeductionRulesCard";
import { StaffRoleCommissionCard } from "./commissionsModules/StaffRoleCommissionCard";
import { useStaffCommissionsState } from "./commissionsModules/useStaffCommissionsState";

export interface StaffCommissionsPanelProps {
	readonly isModalView?: boolean;
}

export const StaffCommissionsPanel: React.FC<StaffCommissionsPanelProps> = ({
	isModalView = false,
}) => {
	const {
		doctors,
		rows,
		withoutRate,
		load,
		save,
		editingUserId,
		draft,
		draftMaterialDeduction,
		draftLabDeduction,
		setDraft,
		setDraftMaterialDeduction,
		setDraftLabDeduction,
		loadRates,
		beginEdit,
		cancelEdit,
		saveRate,
	} = useStaffCommissionsState();

	return (
		<article
			className={
				isModalView
					? "col-span-full flex flex-col gap-3 min-w-0"
					: "settings-card col-span-full flex flex-col gap-4 min-w-0"
			}
			aria-label="Ставки врачей"
			data-testid="staff-commissions-panel"
		>
			<div
				className={
					isModalView
						? "flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-[var(--line)]"
						: "settings-card-header flex items-center justify-between gap-3 flex-wrap"
				}
			>
				{!isModalView ? (
					<div>
						<h4 className="m-0 flex items-center gap-2 text-base font-bold text-[var(--ink)]">
							<Percent size={16} className="text-[var(--teal)]" />
							Ставки врачей и сдельная мотивация (% от кассы)
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-1">
							Процент, по которому клиника начисляет зарплату врачам от оплаченных визитов, а также доли вычета за расходные материалы и лабораторию (ЗТЛ).
						</p>
					</div>
				) : (
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold text-[var(--ink)]">
							Врачей в штате: <strong>{doctors.length}</strong>
						</span>
					</div>
				)}

				<div className="flex items-center gap-2 ml-auto">
					<button
						type="button"
						className="secondary-button h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer"
						style={{
							minHeight: "32px",
							padding: "4px 12px",
							borderRadius: "8px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
						}}
						onClick={() => void loadRates()}
						disabled={load.kind === "loading"}
						data-testid="staff-commissions-refresh"
					>
						{load.kind === "loading" ? "Загрузка…" : "Обновить"}
					</button>
				</div>
			</div>

			<div className="settings-card-body">
				{load.kind === "failed" ? (
					<p className="text-sm text-rose-700 dark:text-rose-300 m-0" role="alert" data-testid="staff-commissions-error">
						{load.message}
					</p>
				) : null}

				{load.kind === "loading" && rows.length === 0 ? (
					<p className="text-sm text-[var(--muted)] m-0" data-testid="staff-commissions-loading">
						Загружаем ставки…
					</p>
				) : null}

				{load.kind === "ready" && rows.length === 0 ? (
					<p className="text-sm text-[var(--muted)] m-0" data-testid="staff-commissions-empty">
						Врачей в штате пока нет. Добавьте сотрудника с ролью «Врач» — здесь появится строка для назначения процента.
					</p>
				) : null}

				{rows.length > 0 ? (
					<>
						{withoutRate > 0 ? (
							<div
								className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 m-0 mb-3"
								role="status"
							>
								<span>Без ставки: <strong>{withoutRate}</strong>. Пока процент не задан, отчёт выплат не включает этого врача в итог к выплате.</span>
							</div>
						) : null}

						{/* 1. Отраслевые ориентиры по ролям персонала */}
						<StaffRoleCommissionCard />

						{/* 2. Детальная таблица ставок врачей (Desktop + Mobile) */}
						<DoctorSpecialtyRatesTable
							rows={rows}
							editingUserId={editingUserId}
							save={save}
							draft={draft}
							draftMaterialDeduction={draftMaterialDeduction}
							draftLabDeduction={draftLabDeduction}
							onSetDraft={setDraft}
							onSetDraftMaterial={setDraftMaterialDeduction}
							onSetDraftLab={setDraftLabDeduction}
							onBeginEdit={beginEdit}
							onCancelEdit={cancelEdit}
							onSaveRate={saveRate}
						/>

						{/* 3. Правила удержания ЗТЛ и материалов */}
						<MaterialDeductionRulesCard />

						{/* 4. Интерактивный калькулятор сдельной оплаты */}
						<div className="mt-2">
							<DoctorMotivationCalculator />
						</div>
					</>
				) : null}

				{save.kind === "failed" ? (
					<p className="text-sm text-rose-700 dark:text-rose-300 m-0 mt-3" role="alert" data-testid="staff-commissions-error">
						{save.message}
					</p>
				) : null}
			</div>
		</article>
	);
};

export default StaffCommissionsPanel;
