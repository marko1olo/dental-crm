/**
 * DENTE Dental CRM — Column Focus Batch & Filter Toolbar (Layer 1)
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy)
 * Filter toolbar with real-time text search, SLA urgency filter tabs, sort picker, CSV export,
 * and bulk operations panel (1-click batch move to next stage, batch doctor assignment, batch stage transfer).
 */

import React from "react";
import { ArrowRight, Download, Search, X } from "lucide-react";
import type { LeadStatus } from "../../../store/leadsStore";
import type { LeadSlaUrgency, LeadSortOption } from "../leadsKanbanTypes";
import type { ColumnFocusBatchToolbarProps } from "./types";

export const ColumnFocusBatchToolbar: React.FC<ColumnFocusBatchToolbarProps> = ({
	searchQuery,
	onSearchQueryChange,
	urgencyFilter,
	onUrgencyFilterChange,
	metrics,
	sortOption,
	onSortOptionChange,
	onExportCsv,
	selectedLeadIds,
	totalDisplayLeads,
	onToggleSelectAll,
	nextStageInfo,
	isProcessingBatch,
	onBatchAdvance,
	onBatchMoveToStage,
	staff,
	batchTargetDoctorId,
	onBatchTargetDoctorIdChange,
	onBatchAssign,
	onClearSelection,
}) => {
	return (
		<>
			{/* Filter & Sort Toolbar */}
			<div className="expanded-focus-toolbar">
				{/* Search Box */}
				<div className="dente-search-wrap expanded-focus-search-box min-w-[260px] max-w-[340px] flex-1">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Поиск по имени, телефону, жалобе..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						className="dente-search-input"
						aria-label="Поиск по имени, телефону или жалобе"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchQueryChange("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{/* SLA Urgency Filter Tabs */}
				<div
					className="expanded-focus-urgency-tabs dente-segmented-bar"
					role="tablist"
				>
					<button
						type="button"
						className={`expanded-focus-tab dente-segmented-item ${urgencyFilter === "all" ? "is-active active" : ""}`}
						onClick={() => onUrgencyFilterChange("all")}
					>
						Все ({metrics.totalCount})
					</button>
					<button
						type="button"
						className={`expanded-focus-tab dente-segmented-item expanded-focus-tab--fresh ${urgencyFilter === "fresh" ? "is-active active" : ""}`}
						onClick={() => onUrgencyFilterChange("fresh")}
					>
						Свежие ({metrics.freshCount})
					</button>
					<button
						type="button"
						className={`expanded-focus-tab dente-segmented-item expanded-focus-tab--warning ${urgencyFilter === "warning" ? "is-active active" : ""}`}
						onClick={() => onUrgencyFilterChange("warning")}
					>
						Внимание ({metrics.warningCount})
					</button>
					{metrics.breachedCount > 0 && (
						<button
							type="button"
							className={`expanded-focus-tab dente-segmented-item expanded-focus-tab--breached ${urgencyFilter === "breached" ? "is-active active" : ""}`}
							onClick={() => onUrgencyFilterChange("breached")}
						>
							Просрочен SLA ({metrics.breachedCount})
						</button>
					)}
				</div>

				{/* Sort Selector */}
				<div className="expanded-focus-sort-cluster">
					<span className="text-[11.5px] text-[var(--muted)] font-medium">
						Сортировка:
					</span>
					<select
						value={sortOption}
						onChange={(e) =>
							onSortOptionChange(e.target.value as LeadSortOption)
						}
						className="expanded-focus-select"
					>
						<option value="sla_urgent">Срочные по SLA</option>
						<option value="created_desc">Сначала новые</option>
						<option value="created_asc">Сначала старые</option>
						<option value="revenue_desc">По выручке (макс)</option>
						<option value="name_asc">По имени (А-Я)</option>
					</select>
				</div>

				{/* CSV Export Button */}
				<button
					type="button"
					onClick={() => onExportCsv(false)}
					className="expanded-focus-csv-btn"
					title="Экспортировать обращения этапа в Excel CSV"
					data-testid="focus-csv-export-btn"
				>
					<Download size={13} />
					<span>CSV Экспорт</span>
				</button>
			</div>

			{/* Bulk Action Bar (Conditional on selected items) */}
			{selectedLeadIds.size > 0 && (
				<div
					className="expanded-focus-bulk-bar"
					data-testid="focus-bulk-bar"
				>
					<div className="flex items-center gap-2">
						<span className="expanded-focus-bulk-count">
							Выбрано: <strong>{selectedLeadIds.size}</strong> из{" "}
							{totalDisplayLeads}
						</span>
						<button
							type="button"
							onClick={onToggleSelectAll}
							className="expanded-focus-bulk-link"
						>
							{selectedLeadIds.size === totalDisplayLeads
								? "Снять выбор"
								: "Выбрать все"}
						</button>
					</div>

					<div className="expanded-focus-bulk-actions">
						{/* 1-click batch move to next stage */}
						{nextStageInfo && (
							<button
								type="button"
								disabled={isProcessingBatch}
								onClick={onBatchAdvance}
								className="expanded-focus-bulk-primary-btn"
								data-testid="focus-batch-advance-btn"
							>
								<span>
									{nextStageInfo.label} ({selectedLeadIds.size})
								</span>
								<ArrowRight size={13} />
							</button>
						)}

						{/* Batch move dropdown to any other status */}
						<select
							onChange={(e) => {
								if (e.target.value) {
									onBatchMoveToStage(e.target.value as LeadStatus);
									e.target.value = "";
								}
							}}
							defaultValue=""
							disabled={isProcessingBatch}
							className="expanded-focus-bulk-select"
						>
							<option value="" disabled>
								Перенести пачку в этап...
							</option>
							<option value="new">1. Новые</option>
							<option value="contacted">2. Квалифицированные</option>
							<option value="consult_booked">3. Консультация</option>
							<option value="showed_up">4. Дошли</option>
							<option value="no_answer">Недозвон</option>
							<option value="trash">Отказ</option>
						</select>

						{/* Batch Doctor Assignment */}
						{staff.length > 0 && (
							<div className="flex items-center gap-1.5">
								<select
									value={batchTargetDoctorId}
									onChange={(e) =>
										onBatchTargetDoctorIdChange(e.target.value)
									}
									disabled={isProcessingBatch}
									className="expanded-focus-bulk-select"
								>
									<option value="">Назначить врача...</option>
									{staff.map((doc) => (
										<option key={doc.id} value={doc.id}>
											{doc.fullName || doc.name}
										</option>
									))}
								</select>
								{batchTargetDoctorId && (
									<button
										type="button"
										onClick={onBatchAssign}
										disabled={isProcessingBatch}
										className="expanded-focus-bulk-confirm-btn"
									>
										Применить
									</button>
								)}
							</div>
						)}

						{/* Export selected CSV */}
						<button
							type="button"
							onClick={() => onExportCsv(true)}
							className="expanded-focus-bulk-secondary-btn"
							title="Экспорт выбранных лидов в CSV"
						>
							<Download size={12} />
							<span>Экспорт ({selectedLeadIds.size})</span>
						</button>

						{/* Clear Selection */}
						<button
							type="button"
							onClick={onClearSelection}
							className="expanded-focus-bulk-cancel-btn"
							title="Снять выделение"
						>
							<X size={13} />
						</button>
					</div>
				</div>
			)}
		</>
	);
};
