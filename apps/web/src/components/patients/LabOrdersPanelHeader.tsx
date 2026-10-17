import type React from "react";
import { ChevronDown, Clock, FlaskConical, Layers, Plus, RefreshCw, Zap } from "lucide-react";
import { EXPRESS_LAB_PRESETS } from "../lab/labMath";
import type { useLabOrdersPanelLogic } from "./useLabOrdersPanelLogic";

interface LabOrdersPanelHeaderProps {
	logic: ReturnType<typeof useLabOrdersPanelLogic>;
}

export const LabOrdersPanelHeader: React.FC<LabOrdersPanelHeaderProps> = ({ logic }) => (
	<div className="lab-orders-header h-9 min-h-[36px] flex items-center justify-between gap-2 px-1">
		<div className="flex items-center gap-2 shrink-0">
			<h3 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 whitespace-nowrap">
				<FlaskConical className="w-4 h-4 text-[var(--teal)] shrink-0" />
				<span>CAD/CAM ЗТЛ</span>
			</h3>
			<span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
				{logic.orders.length} наряд{logic.orders.length === 1 ? "" : logic.orders.length < 5 ? "а" : "ов"}
			</span>
		</div>

		<div className="lab-orders-toolbar">
			<button type="button" onClick={logic.fetchOrders} className="lab-btn-32" title="Обновить список">
				<RefreshCw className={`w-3.5 h-3.5 ${logic.loading ? "animate-spin text-[var(--teal)]" : ""}`} />
			</button>

			<div className="relative inline-block" ref={logic.presetsMenuRef}>
				<button
					type="button"
					onClick={() => logic.setIsPresetsMenuOpen((prev) => !prev)}
					disabled={logic.submitting}
					className="lab-btn-32"
					title="Инструменты, шаблоны и трекер ЗТЛ"
					aria-expanded={logic.isPresetsMenuOpen}
					aria-haspopup="true"
				>
					<Layers className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Шаблоны и трекер</span>
					<ChevronDown className={`w-3 h-3 transition-transform ${logic.isPresetsMenuOpen ? "rotate-180" : ""}`} />
				</button>

				{logic.isPresetsMenuOpen && (
					<div className="absolute right-0 sm:left-0 top-full mt-1 w-64 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg p-1.5 z-30 space-y-1">
						<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
							Экспресс-шаблоны ЗТЛ:
						</div>
						<button
							type="button"
							onClick={() => { logic.setIsPresetsMenuOpen(false); void logic.handleOneClickCreate(); }}
							disabled={logic.submitting}
							className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-between transition-colors cursor-pointer"
							title="Оформить наряд ЗТЛ: Коронка цирконий/E.max, цвет VITA A2, срок 7 рабочих дней"
							data-testid="lab-order-one-click-btn"
						>
							<div className="flex items-center gap-2">
								<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
								<div><div className="font-bold">Цирконий A2 (7 дн.)</div><div className="text-[10px] text-[var(--muted)]">Коронка Zr/E.max, цвет A2</div></div>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								logic.setIsPresetsMenuOpen(false);
								const pmma = EXPRESS_LAB_PRESETS.find((p) => p.id === "pmma_temp");
								if (pmma) void logic.handleExpressPresetCreate(pmma);
							}}
							disabled={logic.submitting}
							className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-between transition-colors cursor-pointer"
							data-testid="lab-order-preset-pmma-btn"
						>
							<div className="flex items-center gap-2">
								<Zap className="w-3.5 h-3.5 text-teal-500 shrink-0" />
								<div><div className="font-bold">Временная PMMA (2 дн.)</div><div className="text-[10px] text-[var(--muted)]">CAD/CAM фрезеровка</div></div>
							</div>
						</button>

						<div className="border-t border-[var(--line)] my-1" />

						<button
							type="button"
							onClick={() => { logic.setIsPresetsMenuOpen(false); logic.setIsTrackerModalOpen(true); }}
							className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 transition-colors cursor-pointer"
							data-testid="lab-orders-tracker-trigger"
						>
							<Clock className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span>Трекер нарядов и дедлайнов</span>
						</button>

						<button
							type="button"
							onClick={() => { logic.setIsPresetsMenuOpen(false); logic.setIsLabHubOpen(true); }}
							className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 transition-colors cursor-pointer"
							data-testid="lab-orders-hub-trigger"
						>
							<Layers className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span>Реестр нарядов ЗТЛ</span>
						</button>
					</div>
				)}
			</div>

			<button
				type="button"
				onClick={() => { logic.setSelectedOrderForEdit(null); logic.setIsOrderModalOpen(true); }}
				className="lab-btn-32 is-primary"
				title="Оформить заказ в лабораторию"
				data-testid="btn-create-lab-order"
			>
				<Plus className="w-3.5 h-3.5" />
				<span>+ Заказ в лабораторию</span>
			</button>
		</div>
	</div>
);
