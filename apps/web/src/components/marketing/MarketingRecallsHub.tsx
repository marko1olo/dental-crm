/**
 * MarketingRecallsHub.tsx
 * Practical Recalls Hub for Patient Prophylaxis & 1-Click Messaging.
 * Governed by Mandates 8b (Strict <= 120 lines), 8e, 8n (Solo Doctor Sovereignty).
 */

import React from "react";
import { Users, Search, RefreshCw, MessageSquare, Send } from "lucide-react";
import { showToast } from "../GlobalToast";
import { useMarketingRecallsData } from "./useMarketingRecallsData";
import { MarketingRecallPatientCard } from "./MarketingRecallPatientCard";
import type { RecallCategoryFilter } from "./marketingRecallsTypes";

export interface MarketingRecallsHubProps {
	readonly clinicName?: string;
	readonly onBookAppointment?: (patientId: string) => void;
}

export function MarketingRecallsHub({ clinicName = "Стоматология ДЕНТЕ", onBookAppointment }: MarketingRecallsHubProps) {
	const { candidates, allCount, loading, error, activeCategory, setActiveCategory, searchQuery, setSearchQuery, calledIds, markCalled, stats, reload } = useMarketingRecallsData();

	const handleOpenOmnichannelChat = () => {
		window.dispatchEvent(new CustomEvent("dente:open-chat-panel"));
	};

	const handleBatchReminders = () => {
		if (candidates.length === 0) {
			showToast("Нет пациентов в текущем списке для напоминаний", "info");
			return;
		}
		for (const c of candidates) markCalled(c.id);
		showToast(`Отправлены напоминания ${candidates.length} пациентам`, "success");
	};

	return (
		<section className="panel ops-panel marketing-recalls-container" data-testid="recall-list-panel" aria-label="Журнал напоминаний пациентам">
			<div className="panel-heading marketing-recalls-toolbar">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
						<Users size={18} aria-hidden="true" />
					</div>
					<div>
						<h2 className="text-base font-bold text-[var(--ink)] m-0">Журнал напоминаний</h2>
						<span className="text-xs text-[var(--muted)]">Профилактические осмотры, гигиена и контроль приживаемости</span>
					</div>
					<span className="status-pill status-planned">К вызову: {allCount}</span>
				</div>
				<div className="flex items-center gap-2">
					<button type="button" data-testid="btn-batch-recall-reminders" onClick={handleBatchReminders} className="primary-button h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5" style={{ backgroundColor: "var(--teal, #0d9488)", borderColor: "var(--teal, #0d9488)", color: "#ffffff" }} title="Отправить напоминания">
						<Send size={13} /><span>Отправить напоминания</span>
					</button>
					<button type="button" onClick={handleOpenOmnichannelChat} className="secondary-button h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5" title="Открыть диалоги с пациентами">
						<MessageSquare size={14} className="text-[var(--primary)]" /><span>Чаты с пациентами</span>
					</button>
					<button type="button" onClick={reload} disabled={loading} className="secondary-button h-8 min-h-[32px] px-2.5 rounded-lg text-xs" title="Обновить список">
						<RefreshCw size={13} className={loading ? "animate-spin" : ""} />
					</button>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 my-2">
				<div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Фильтр процедур">
					{(["all", "hygiene", "ortho", "implant", "overdue"] as const).map((cat) => {
						const labels: Record<RecallCategoryFilter, string> = {
							all: `Все (${allCount})`, hygiene: `Гигиена 6 мес. (${stats.hygieneCount})`,
							ortho: `Ортопедия 1 год (${stats.orthoCount})`, implant: `Импланты 3 мес. (${stats.implantCount})`,
							overdue: `Просрочен осмотр (${stats.overdueCount})`,
						};
						return (
							<button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={`marketing-top-tab h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold ${activeCategory === cat ? "marketing-top-tab--active active font-bold" : ""}`}>
								{labels[cat]}
							</button>
						);
					})}
				</div>
				<div className="relative min-w-[200px] max-w-[280px] w-full">
					<Search size={14} className="absolute left-2.5 top-2.5 text-[var(--muted)]" />
					<input type="text" placeholder="Поиск по имени или телефону..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[var(--ink)]" />
				</div>
			</div>

			{error && <p className="ops-notice ops-notice--error m-0" role="alert">{error}</p>}

			<div className="marketing-recalls-stream">
				{candidates.length === 0 && !loading ? (
					<div className="text-center py-8 text-[var(--muted)]">
						<Users size={32} className="mx-auto mb-2 opacity-50" />
						<p className="text-sm font-medium">Нет пациентов, требующих вызова по выбранному фильтру</p>
					</div>
				) : (
					candidates.map((c) => (
						<MarketingRecallPatientCard key={c.id} candidate={c} clinicName={clinicName} isCalled={calledIds.has(c.id)} onMarkCalled={markCalled} onBookAppointment={onBookAppointment} />
					))
				)}
			</div>
		</section>
	);
}
export default MarketingRecallsHub;
