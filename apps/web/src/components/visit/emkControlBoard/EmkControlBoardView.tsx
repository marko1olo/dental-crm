import React from "react";
import {
	AlertCircle,
	CheckCircle2,
	Filter,
	RefreshCw,
	ShieldCheck,
	Zap,
} from "lucide-react";
import { EmptyState } from "../../EmptyState";
import { EmkMetricsSummaryStrip } from "./EmkMetricsSummaryStrip";
import { EmkVisitCard } from "./EmkVisitCard";
import { EmkVisitHandoffModal } from "./EmkVisitHandoffModal";
import type { useEmkControlBoard } from "./useEmkControlBoard";

export interface EmkControlBoardViewProps {
	readonly board: ReturnType<typeof useEmkControlBoard>;
}

export function EmkControlBoardView({ board }: EmkControlBoardViewProps) {
	const {
		loading,
		error,
		submittingId,
		batchSubmitting,
		selectedTab,
		setSelectedTab,
		searchQuery,
		setSearchQuery,
		expandedVisitId,
		setExpandedVisitId,
		rejectionTarget,
		setRejectionTarget,
		loadVisits,
		metrics,
		filteredVisits,
		handleApprove,
		handleRejectSubmit,
		handleBatchApproveAllEligible,
	} = board;

	if (loading) {
		return (
			<div
				style={{
					padding: "24px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "10px",
					color: "var(--ink-2, #64748b)",
					fontSize: "14px",
				}}
			>
				<RefreshCw size={18} className="animate-spin" />
				Загрузка журнала контроля качества ЭМК...
			</div>
		);
	}

	return (
		<div
			className="emk-control-board"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "18px",
				padding: "20px",
			}}
		>
			{/* ───────────────────────────────────────────────────────────────── */}
			{/* TIER 1: HEADER & STATUTORY METRICS HUD */}
			{/* ───────────────────────────────────────────────────────────────── */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "16px",
				}}
			>
				<div>
					<h2
						style={{
							margin: 0,
							fontSize: "20px",
							fontWeight: 700,
							color: "var(--ink, #0f172a)",
							display: "flex",
							alignItems: "center",
							gap: "10px",
						}}
					>
						<ShieldCheck size={24} style={{ color: "var(--teal, #0d9488)" }} />
						Контроль качества ЭМК Главным врачом
					</h2>
					<p
						style={{
							margin: "4px 0 0",
							fontSize: "13px",
							color: "var(--ink-2, #64748b)",
						}}
					>
						Соответствие медицинским картам, стандартам Минздрава и СтАР
					</p>
				</div>

				{/* Primary Batch Action CTA */}
				{metrics.instantApprovalEligibleCount > 0 && (
					<button
						type="button"
						onClick={handleBatchApproveAllEligible}
						disabled={batchSubmitting}
						style={{
							background: "var(--teal, #0d9488)",
							color: "var(--paper-strong, #ffffff)",
							border: "none",
							padding: "10px 18px",
							borderRadius: "8px",
							fontSize: "14px",
							fontWeight: 600,
							cursor: batchSubmitting ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							boxShadow: "0 4px 12px rgba(13, 148, 136, 0.25)",
							transition: "all 0.2s ease",
							minHeight: "44px",
						}}
					>
						<Zap size={18} />
						{batchSubmitting
							? "Утверждение..."
							: `Утвердить проверенные карты (${metrics.instantApprovalEligibleCount})`}
					</button>
				)}
			</div>

			{/* Metrics Summary Strip */}
			<EmkMetricsSummaryStrip metrics={metrics} />

			{/* ───────────────────────────────────────────────────────────────── */}
			{/* TIER 2: FILTER TABS & SEARCH BAR */}
			{/* ───────────────────────────────────────────────────────────────── */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "12px",
					borderBottom: "1px solid var(--line, #e2e8f0)",
					paddingBottom: "12px",
				}}
			>
				{/* Status Tabs */}
				<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={() => setSelectedTab("pending")}
						style={{
							padding: "8px 14px",
							borderRadius: "8px",
							fontSize: "13px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								selectedTab === "pending"
									? "var(--teal, #0d9488)"
									: "var(--paper-strong, #f1f5f9)",
							color:
								selectedTab === "pending"
									? "var(--paper-strong, #ffffff)"
									: "var(--ink, #0f172a)",
						}}
					>
						На проверке ({metrics.pendingReviewCount})
					</button>

					<button
						type="button"
						onClick={() => setSelectedTab("needs_correction")}
						style={{
							padding: "8px 14px",
							borderRadius: "8px",
							fontSize: "13px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								selectedTab === "needs_correction"
									? "var(--bad, #ef4444)"
									: "var(--paper-strong, #f1f5f9)",
							color:
								selectedTab === "needs_correction"
									? "var(--paper-strong, #ffffff)"
									: "var(--ink, #0f172a)",
						}}
					>
						На доработке ({metrics.needsCorrectionCount})
					</button>

					<button
						type="button"
						onClick={() => setSelectedTab("approved")}
						style={{
							padding: "8px 14px",
							borderRadius: "8px",
							fontSize: "13px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								selectedTab === "approved"
									? "var(--good, #10b981)"
									: "var(--paper-strong, #f1f5f9)",
							color:
								selectedTab === "approved"
									? "var(--paper-strong, #ffffff)"
									: "var(--ink, #0f172a)",
						}}
					>
						Утверждено ({metrics.approvedCount})
					</button>

					<button
						type="button"
						onClick={() => setSelectedTab("all")}
						style={{
							padding: "8px 14px",
							borderRadius: "8px",
							fontSize: "13px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								selectedTab === "all"
									? "var(--ink, #0f172a)"
									: "var(--paper-strong, #f1f5f9)",
							color:
								selectedTab === "all"
									? "var(--paper-strong, #ffffff)"
									: "var(--ink, #0f172a)",
						}}
					>
						Все карты ({metrics.totalVisitsCount})
					</button>
				</div>

				{/* Search Input */}
				<div style={{ position: "relative", minWidth: "260px" }}>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по пациенту, врачу или МКБ..."
						style={{
							width: "100%",
							padding: "8px 12px 8px 32px",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #ffffff)",
							color: "var(--ink, #0f172a)",
							fontSize: "13px",
							outline: "none",
							boxSizing: "border-box",
						}}
					/>
					<Filter
						size={14}
						style={{
							position: "absolute",
							left: "10px",
							top: "50%",
							transform: "translateY(-50%)",
							color: "var(--ink-2, #64748b)",
						}}
					/>
				</div>
			</div>

			{/* Error Alert */}
			{error && (
				<div
					style={{
						padding: "12px 16px",
						borderRadius: "8px",
						background: "rgba(239, 68, 68, 0.1)",
						border: "1px solid var(--bad, #ef4444)",
						color: "var(--bad, #ef4444)",
						fontSize: "13px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<AlertCircle size={16} />
						<span>{error}</span>
					</div>
					<button
						type="button"
						onClick={loadVisits}
						style={{
							background: "transparent",
							border: "none",
							textDecoration: "underline",
							color: "inherit",
							cursor: "pointer",
							fontWeight: 600,
						}}
					>
						Повторить
					</button>
				</div>
			)}

			{/* ───────────────────────────────────────────────────────────────── */}
			{/* TIER 3: VISITS LIST & INTERACTIVE AUDIT CARDS */}
			{/* ───────────────────────────────────────────────────────────────── */}
			{filteredVisits.length === 0 ? (
				<EmptyState
					icon={<CheckCircle2 size={36} />}
					title="Нет записей в выбранной категории"
					description="Все карты пациентов проверены и соответствуют клиническим стандартам."
					glass={false}
				/>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
					{filteredVisits.map((visit) => (
						<EmkVisitCard
							key={visit.id}
							visit={visit}
							isExpanded={expandedVisitId === visit.id}
							submittingId={submittingId}
							onToggleExpand={() =>
								setExpandedVisitId(
									expandedVisitId === visit.id ? null : visit.id,
								)
							}
							onApprove={handleApprove}
							onReject={setRejectionTarget}
						/>
					))}
				</div>
			)}

			{/* Rejection Remarks Modal */}
			{rejectionTarget && (
				<EmkVisitHandoffModal
					visit={rejectionTarget}
					isOpen={Boolean(rejectionTarget)}
					onClose={() => setRejectionTarget(null)}
					onSubmit={handleRejectSubmit}
					isSubmitting={submittingId === rejectionTarget.id}
				/>
			)}
		</div>
	);
}
