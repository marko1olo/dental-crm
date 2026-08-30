import {
	Activity,
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	FileCheck,
	FileText,
	Filter,
	MessageSquare,
	RefreshCw,
	Send,
	ShieldCheck,
	Sparkles,
	User,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatShortDate } from "../../AppHelpers";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { logger } from "../../utils/logger";
import { EmptyState } from "../EmptyState";
import {
	type CmoAuditEvaluatedVisit,
	type CmoAuditVisitItem,
	type EmkDefectTag,
	type EmkQualityStatus,
	EMK_DEFECT_TAGS_CATALOG,
	calculateCmoAuditSummary,
	evaluateVisitForCmoAudit,
} from "@dental/shared";

/**
 * Diagnocat AI report widget.
 */
type DiagnocatReport = {
	readonly id: string;
	readonly reportUrl: string;
	readonly createdAt: string | null;
};

function DiagnocatReportWidget({ patientId }: { patientId: string }) {
	const [reports, setReports] = useState<DiagnocatReport[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/integrations/diagnocat/reports/${patientId}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data: { success?: boolean; reports?: unknown }) => {
				if (cancelled) return;
				if (!data.success || !Array.isArray(data.reports)) {
					throw new Error("Ответ сервера не содержит списка отчётов");
				}
				setReports(data.reports as DiagnocatReport[]);
				setLoadError(null);
			})
			.catch((err) => {
				if (cancelled) return;
				logger.error("Failed to load AI reports", err);
				setLoadError("Отчёты Diagnocat недоступны");
			});
		return () => {
			cancelled = true;
		};
	}, [patientId]);

	if (loadError) {
		return (
			<div
				style={{
					color: "var(--bad, #ef4444)",
					fontSize: 12,
					display: "flex",
					alignItems: "center",
					gap: 4,
				}}
			>
				<AlertTriangle size={13} /> {loadError}
			</div>
		);
	}

	if (reports.length === 0) return null;

	return (
		<div
			style={{
				marginTop: "8px",
				padding: "8px 12px",
				background: "rgba(13, 148, 136, 0.08)",
				border: "1px solid rgba(13, 148, 136, 0.2)",
				borderRadius: "6px",
				fontSize: "12px",
				color: "var(--teal-dark, #0f766e)",
				display: "flex",
				alignItems: "center",
				gap: "8px",
			}}
		>
			<Activity size={15} />
			<div>
				<strong>Diagnocat AI:</strong> Найдено отчетов ({reports.length})
			</div>
			<div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
				{reports.map((r, reportIdx) => (
					<a
						key={r.id || r.reportUrl || `report-item-${r.createdAt || reportIdx}`}
						href={r.reportUrl}
						target="_blank"
						rel="noreferrer"
						style={{
							color: "var(--teal-dark, #0f766e)",
							textDecoration: "underline",
							fontWeight: 500,
						}}
					>
						Смотреть #{reportIdx + 1}
					</a>
				))}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS & REJECTION MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface RejectionModalProps {
	readonly visit: CmoAuditEvaluatedVisit;
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSubmit: (
		visitId: string,
		rejectionReason: string,
		defectTags: EmkDefectTag[],
	) => Promise<void>;
	readonly isSubmitting: boolean;
}

function RejectionModal({
	visit,
	isOpen,
	onClose,
	onSubmit,
	isSubmitting,
}: RejectionModalProps) {
	const [reason, setReason] = useState("");
	const [selectedTags, setSelectedTags] = useState<EmkDefectTag[]>([]);

	useEffect(() => {
		if (isOpen) {
			setSelectedTags(
				visit.detectedDefects.length > 0
					? [...visit.detectedDefects]
					: ["missing_treatment_protocol"],
			);
			setReason(visit.cmoRemarks || "");
		}
	}, [isOpen, visit]);

	if (!isOpen) return null;

	const toggleTag = (tag: EmkDefectTag) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
		);
	};

	const handleSend = async () => {
		if (!reason.trim()) return;
		await onSubmit(visit.id, reason, selectedTags);
		onClose();
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0,0,0,0.65)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
				padding: "16px",
			}}
		>
			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "14px",
					width: "100%",
					maxWidth: "640px",
					boxShadow: "var(--shadow-3, 0 20px 25px -5px rgba(0,0,0,0.2))",
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{/* Header */}
				<div
					style={{
						padding: "16px 20px",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								background: "rgba(239, 68, 68, 0.12)",
								color: "var(--bad, #ef4444)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<AlertTriangle size={20} />
						</div>
						<div>
							<h3
								style={{
									margin: 0,
									fontSize: "16px",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
								}}
							>
								Возврат карты на доработку врачу
							</h3>
							<p
								style={{
									margin: 0,
									fontSize: "12px",
									color: "var(--ink-2, #64748b)",
								}}
							>
								Пациент: {visit.patientFullName} | Врач: {visit.doctorFullName}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "transparent",
							border: "none",
							cursor: "pointer",
							color: "var(--ink-2, #64748b)",
							padding: "6px",
							borderRadius: "6px",
						}}
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<div
					style={{
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
						maxHeight: "70vh",
						overflowY: "auto",
					}}
				>
					{/* Defect Tags */}
					<div>
						<label
							style={{
								display: "block",
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink, #0f172a)",
								marginBottom: "8px",
							}}
						>
							Укажите клинические замечания к разделам ф. 043/у:
						</label>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
								gap: "6px",
							}}
						>
							{EMK_DEFECT_TAGS_CATALOG.map((meta) => {
								const isSelected = selectedTags.includes(meta.tag);
								return (
									<button
										key={meta.tag}
										type="button"
										onClick={() => toggleTag(meta.tag)}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											padding: "8px 10px",
											borderRadius: "6px",
											fontSize: "12px",
											textAlign: "left",
											cursor: "pointer",
											transition: "all 0.15s ease",
											border: isSelected
												? "1px solid var(--bad, #ef4444)"
												: "1px solid var(--line, #e2e8f0)",
											background: isSelected
												? "rgba(239, 68, 68, 0.08)"
												: "var(--paper, #ffffff)",
											color: isSelected
												? "var(--bad, #ef4444)"
												: "var(--ink, #0f172a)",
											fontWeight: isSelected ? 600 : 400,
										}}
									>
										<div
											style={{
												width: "14px",
												height: "14px",
												borderRadius: "3px",
												border: isSelected
													? "1px solid var(--bad, #ef4444)"
													: "1px solid var(--ink-2, #64748b)",
												background: isSelected
													? "var(--bad, #ef4444)"
													: "transparent",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "#ffffff",
												fontSize: "10px",
												flexShrink: 0,
											}}
										>
											{isSelected && "✓"}
										</div>
										<span>{meta.labelRu}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Custom Comment Field */}
					<div>
						<label
							htmlFor="cmo-rejection-reason"
							style={{
								display: "block",
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink, #0f172a)",
								marginBottom: "6px",
							}}
						>
							Мотивированное предписание Главного врача: *
						</label>
						<textarea
							id="cmo-rejection-reason"
							rows={4}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Опишите, какие разделы истории болезни необходимо исправить или дополнить..."
							style={{
								width: "100%",
								padding: "10px 12px",
								fontSize: "13px",
								borderRadius: "8px",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-strong, #f8fafc)",
								color: "var(--ink, #0f172a)",
								outline: "none",
								boxSizing: "border-box",
							}}
						/>
					</div>
				</div>

				{/* Footer */}
				<div
					style={{
						padding: "14px 20px",
						borderTop: "1px solid var(--line, #e2e8f0)",
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
						gap: "10px",
						background: "var(--paper-strong, #f8fafc)",
					}}
				>
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						style={{
							padding: "8px 16px",
							fontSize: "13px",
							fontWeight: 500,
							borderRadius: "6px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #ffffff)",
							color: "var(--ink, #0f172a)",
							cursor: "pointer",
						}}
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleSend}
						disabled={isSubmitting || !reason.trim()}
						style={{
							padding: "8px 16px",
							fontSize: "13px",
							fontWeight: 600,
							borderRadius: "6px",
							border: "none",
							background: "var(--bad, #ef4444)",
							color: "#ffffff",
							cursor:
								isSubmitting || !reason.trim() ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							opacity: isSubmitting || !reason.trim() ? 0.6 : 1,
						}}
					>
						<Send size={14} />
						{isSubmitting ? "Отправка..." : "Отправить на доработку"}
					</button>
				</div>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: EmkControlBoard
// ─────────────────────────────────────────────────────────────────────────────

export interface EmkControlBoardProps {
	// biome-ignore lint/suspicious/noExplicitAny: integration dashboard prop
	readonly dashboard?: any;
}

export function EmkControlBoard({ dashboard }: EmkControlBoardProps) {
	const [rawVisits, setRawVisits] = useState<CmoAuditVisitItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [submittingId, setSubmittingId] = useState<string | null>(null);
	const [batchSubmitting, setBatchSubmitting] = useState(false);

	// Filters
	const [selectedTab, setSelectedTab] = useState<EmkQualityStatus | "all">(
		"pending",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

	// Rejection modal state
	const [rejectionTarget, setRejectionTarget] =
		useState<CmoAuditEvaluatedVisit | null>(null);

	const loadVisits = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch("/api/visits/quality-control", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (!res.ok) {
				throw new Error("Не удалось загрузить приемы для проверки");
			}
			const data = await res.json();
			const visitsList = (data.visits || []).map(
				// biome-ignore lint/suspicious/noExplicitAny: backend row map
				(row: any): CmoAuditVisitItem => ({
					id: row.id,
					organizationId: row.organizationId || "org-1",
					patientId: row.patientId,
					patientFullName:
						row.patientFullName || row.patientName || "Пациент клиники",
					patientCardCode: row.patientCardCode || `К-${row.id.slice(0, 6)}`,
					patientBirthDate: row.patientBirthDate || null,
					patientPhone: row.patientPhone || null,
					doctorUserId: row.doctorUserId || row.doctorId || "doc-1",
					doctorFullName:
						row.doctorFullName || row.doctorName || "Лечащий врач",
					doctorSpecialty: row.doctorSpecialty || "Врач-стоматолог",
					chairName: row.chairName || "Кресло 1",
					visitDateIso: row.createdAt || new Date().toISOString(),
					status: row.status || "signed",
					qualityControlStatus: (row.qualityControlStatus as EmkQualityStatus) || "pending",
					chiefComplaint: row.complaint || null,
					anamnesis: row.anamnesis || null,
					objectiveStatus: row.objectiveStatus || null,
					diagnosis: row.diagnosis || null,
					diagnosisIcd10: row.diagnosisIcd10 || null,
					diagnosisTooth: row.diagnosisTooth || null,
					treatmentPlan: row.treatmentPlan || null,
					doctorSummary: row.doctorSummary || null,
					emrSignedAtIso: row.signedAt || null,
					emrPepProtocolHash: row.pepHash || null,
					cmoReviewedAtIso: row.cmoReviewedAt || null,
					cmoReviewedByName: row.cmoReviewedByName || null,
					cmoRemarks: row.cmoRemarks || null,
					cmoDefectTags: row.cmoDefectTags || [],
					servicesCount: row.servicesCount ?? (row.diagnosis ? 2 : 0),
					odontogramTeeth: row.odontogramTeeth || [],
				}),
			);
			setRawVisits(visitsList);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка загрузки";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadVisits();
	}, [loadVisits]);

	// Evaluation and Summary calculation
	const { evaluatedVisits, metrics } = useMemo(() => {
		return calculateCmoAuditSummary(rawVisits);
	}, [rawVisits]);

	// Filtered visits
	const filteredVisits = useMemo(() => {
		return evaluatedVisits.filter((v) => {
			if (selectedTab !== "all" && v.qualityControlStatus !== selectedTab) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesPatient = v.patientFullName.toLowerCase().includes(q);
				const matchesDoctor = v.doctorFullName.toLowerCase().includes(q);
				const matchesDiagnosis = (v.diagnosis || "").toLowerCase().includes(q);
				if (!matchesPatient && !matchesDoctor && !matchesDiagnosis) {
					return false;
				}
			}
			return true;
		});
	}, [evaluatedVisits, selectedTab, searchQuery]);

	// Actions
	const handleApprove = async (visitId: string) => {
		if (submittingId) return;
		try {
			setSubmittingId(visitId);
			const res = await fetch(`/api/visits/${visitId}/quality-control`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					status: "approved",
					cmoRemarks: "Утверждено Главным врачом. Стандарты СтАР соблюдены.",
				}),
			});
			if (!res.ok) throw new Error("Не удалось утвердить карту");
			await loadVisits();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка утверждения";
			setError(msg);
		} finally {
			setSubmittingId(null);
		}
	};

	const handleRejectSubmit = async (
		visitId: string,
		rejectionReason: string,
		defectTags: EmkDefectTag[],
	) => {
		try {
			setSubmittingId(visitId);
			const res = await fetch(`/api/visits/${visitId}/quality-control`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					status: "needs_correction",
					cmoRemarks: rejectionReason,
					defectTags,
				}),
			});
			if (!res.ok) throw new Error("Не удалось отправить карту на доработку");
			await loadVisits();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка возврата карты";
			setError(msg);
		} finally {
			setSubmittingId(null);
		}
	};

	const handleBatchApproveAllEligible = async () => {
		const eligible = evaluatedVisits.filter((v) => v.canBeApprovedInstantly);
		if (eligible.length === 0 || batchSubmitting) return;

		try {
			setBatchSubmitting(true);
			for (const v of eligible) {
				await fetch(`/api/visits/${v.id}/quality-control`, {
					method: "PUT",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						status: "approved",
						cmoRemarks:
							"Пакетное утверждение Главным врачом (100% готовность).",
					}),
				});
			}
			await loadVisits();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка пакетного утверждения";
			setError(msg);
		} finally {
			setBatchSubmitting(false);
		}
	};

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
						Соответствие историям болезни ф. 043/у, приказам Минздрава № 834н,
						804н и стандартам СтАР
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
							color: "#ffffff",
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
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					gap: "12px",
				}}
			>
				<div
					style={{
						background: "var(--paper, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "10px",
						padding: "14px 16px",
					}}
				>
					<div
						style={{
							fontSize: "12px",
							color: "var(--ink-2, #64748b)",
							marginBottom: "4px",
						}}
					>
						На проверке Главврача
					</div>
					<div
						style={{
							fontSize: "22px",
							fontWeight: 700,
							color: "var(--teal, #0d9488)",
						}}
					>
						{metrics.pendingReviewCount}
					</div>
				</div>

				<div
					style={{
						background: "var(--paper, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "10px",
						padding: "14px 16px",
					}}
				>
					<div
						style={{
							fontSize: "12px",
							color: "var(--ink-2, #64748b)",
							marginBottom: "4px",
						}}
					>
						На доработке у врачей
					</div>
					<div
						style={{
							fontSize: "22px",
							fontWeight: 700,
							color: "var(--bad, #ef4444)",
						}}
					>
						{metrics.needsCorrectionCount}
					</div>
				</div>

				<div
					style={{
						background: "var(--paper, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "10px",
						padding: "14px 16px",
					}}
				>
					<div
						style={{
							fontSize: "12px",
							color: "var(--ink-2, #64748b)",
							marginBottom: "4px",
						}}
					>
						Средняя полнота карт 043/у
					</div>
					<div
						style={{
							fontSize: "22px",
							fontWeight: 700,
							color:
								metrics.averageCompletenessScore >= 80
									? "var(--teal, #0d9488)"
									: "var(--warn, #f59e0b)",
						}}
					>
						{metrics.averageCompletenessScore}%
					</div>
				</div>

				<div
					style={{
						background: "var(--paper, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "10px",
						padding: "14px 16px",
					}}
				>
					<div
						style={{
							fontSize: "12px",
							color: "var(--ink-2, #64748b)",
							marginBottom: "4px",
						}}
					>
						Соответствие СтАР / Минздрав
					</div>
					<div
						style={{
							fontSize: "22px",
							fontWeight: 700,
							color: "var(--good, #10b981)",
						}}
					>
						{metrics.complianceRatePercent}%
					</div>
				</div>
			</div>

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
							color: selectedTab === "pending" ? "#ffffff" : "var(--ink, #0f172a)",
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
									? "#ffffff"
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
								selectedTab === "approved" ? "#ffffff" : "var(--ink, #0f172a)",
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
							color: selectedTab === "all" ? "#ffffff" : "var(--ink, #0f172a)",
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
					{filteredVisits.map((visit) => {
						const isExpanded = expandedVisitId === visit.id;
						const score = visit.completeness.totalScore;
						const scoreColor =
							score >= 85
								? "var(--good, #10b981)"
								: score >= 50
									? "var(--warn, #f59e0b)"
									: "var(--bad, #ef4444)";

						return (
							<div
								key={visit.id}
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									borderRadius: "12px",
									padding: "16px 20px",
									boxShadow: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.05))",
									display: "flex",
									flexDirection: "column",
									gap: "12px",
								}}
							>
								{/* Top Row: Patient, Doctor, Date, Score & Actions */}
								<div
									style={{
										display: "flex",
										alignItems: "flex-start",
										justifyContent: "space-between",
										flexWrap: "wrap",
										gap: "12px",
									}}
								>
									{/* Patient & Doctor Meta */}
									<div style={{ flex: "1 1 320px" }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "8px",
												marginBottom: "4px",
											}}
										>
											<span
												style={{
													fontSize: "15px",
													fontWeight: 700,
													color: "var(--ink, #0f172a)",
												}}
											>
												{visit.patientFullName}
											</span>
											<span
												style={{
													fontSize: "11px",
													fontWeight: 600,
													padding: "2px 6px",
													borderRadius: "4px",
													background: "var(--paper-strong, #f1f5f9)",
													color: "var(--ink-2, #64748b)",
												}}
											>
												{visit.patientCardCode}
											</span>
											{visit.diagnosisTooth && (
												<span
													style={{
														fontSize: "11px",
														fontWeight: 700,
														padding: "2px 6px",
														borderRadius: "4px",
														background: "rgba(13, 148, 136, 0.12)",
														color: "var(--teal, #0d9488)",
													}}
												>
													Зуб {visit.diagnosisTooth}
												</span>
											)}
										</div>

										<div
											style={{
												fontSize: "12px",
												color: "var(--ink-2, #64748b)",
												display: "flex",
												alignItems: "center",
												gap: "12px",
												flexWrap: "wrap",
											}}
										>
											<span
												style={{
													display: "flex",
													alignItems: "center",
													gap: "4px",
												}}
											>
												<User size={13} /> {visit.doctorFullName} (
												{visit.doctorSpecialty})
											</span>
											<span
												style={{
													display: "flex",
													alignItems: "center",
													gap: "4px",
												}}
											>
												<Clock size={13} />{" "}
												{formatShortDate(visit.visitDateIso)} |{" "}
												{visit.chairName}
											</span>
										</div>
									</div>

									{/* Completeness Score Pill */}
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											padding: "6px 12px",
											borderRadius: "8px",
											background: "var(--paper-strong, #f8fafc)",
											border: "1px solid var(--line, #e2e8f0)",
										}}
									>
										<div
											style={{
												fontSize: "16px",
												fontWeight: 800,
												color: scoreColor,
											}}
										>
											{score}%
										</div>
										<div
											style={{ fontSize: "10px", color: "var(--ink-2, #64748b)" }}
										>
											Полнота 043/у
										</div>
									</div>

									{/* Action Buttons */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										{visit.qualityControlStatus !== "approved" && (
											<button
												type="button"
												onClick={() => handleApprove(visit.id)}
												disabled={submittingId === visit.id}
												style={{
													background: "var(--teal, #0d9488)",
													color: "#ffffff",
													border: "none",
													padding: "8px 14px",
													borderRadius: "6px",
													fontSize: "13px",
													fontWeight: 600,
													cursor:
														submittingId === visit.id
															? "not-allowed"
															: "pointer",
													display: "flex",
													alignItems: "center",
													gap: "6px",
													minHeight: "44px",
												}}
											>
												<CheckCircle2 size={16} />
												{submittingId === visit.id
													? "Сохранение..."
													: "Утвердить"}
											</button>
										)}

										{visit.qualityControlStatus !== "needs_correction" && (
											<button
												type="button"
												onClick={() => setRejectionTarget(visit)}
												disabled={submittingId === visit.id}
												style={{
													background: "transparent",
													color: "var(--bad, #ef4444)",
													border: "1px solid var(--bad-line, #fecaca)",
													padding: "8px 12px",
													borderRadius: "6px",
													fontSize: "13px",
													fontWeight: 600,
													cursor: "pointer",
													display: "flex",
													alignItems: "center",
													gap: "6px",
													minHeight: "44px",
												}}
											>
												<AlertTriangle size={15} />
												На доработку
											</button>
										)}

										<button
											type="button"
											onClick={() =>
												setExpandedVisitId(isExpanded ? null : visit.id)
											}
											style={{
												background: "var(--paper-strong, #f1f5f9)",
												border: "1px solid var(--line, #e2e8f0)",
												borderRadius: "6px",
												padding: "8px 10px",
												cursor: "pointer",
												color: "var(--ink, #0f172a)",
												minHeight: "44px",
												display: "flex",
												alignItems: "center",
											}}
										>
											{isExpanded ? (
												<ChevronUp size={16} />
											) : (
												<ChevronDown size={16} />
											)}
										</button>
									</div>
								</div>

								{/* Clinical Highlights Strip */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										flexWrap: "wrap",
										fontSize: "13px",
									}}
								>
									{visit.diagnosis && (
										<span
											style={{
												padding: "4px 8px",
												borderRadius: "6px",
												background: "rgba(13, 148, 136, 0.08)",
												color: "var(--teal-dark, #0f766e)",
												fontWeight: 500,
											}}
										>
											Диагноз: {visit.diagnosis}
										</span>
									)}
									{visit.chiefComplaint && (
										<span style={{ color: "var(--ink-2, #64748b)" }}>
											Жалобы: {visit.chiefComplaint}
										</span>
									)}
								</div>

								{/* Diagnocat AI Widget Link */}
								{visit.patientId && (
									<DiagnocatReportWidget patientId={visit.patientId} />
								)}

								{/* Remarks Banner if present */}
								{visit.cmoRemarks && (
									<div
										style={{
											padding: "10px 12px",
											borderRadius: "8px",
											background:
												visit.qualityControlStatus === "needs_correction"
													? "rgba(239, 68, 68, 0.08)"
													: "rgba(16, 185, 129, 0.08)",
											border:
												visit.qualityControlStatus === "needs_correction"
													? "1px solid rgba(239, 68, 68, 0.25)"
													: "1px solid rgba(16, 185, 129, 0.25)",
											color:
												visit.qualityControlStatus === "needs_correction"
													? "var(--bad, #ef4444)"
													: "var(--good, #10b981)",
											fontSize: "12px",
											display: "flex",
											alignItems: "flex-start",
											gap: "8px",
										}}
									>
										<MessageSquare size={15} style={{ flexShrink: 0, marginTop: 2 }} />
										<div>
											<strong>Замечание Главврача:</strong> {visit.cmoRemarks}
										</div>
									</div>
								)}

								{/* Expanded 7-Section Form 043/u Audit Accordion */}
								{isExpanded && (
									<div
										style={{
											borderTop: "1px solid var(--line, #e2e8f0)",
											paddingTop: "12px",
											marginTop: "6px",
											display: "flex",
											flexDirection: "column",
											gap: "10px",
										}}
									>
										<div
											style={{
												fontSize: "13px",
												fontWeight: 700,
												color: "var(--ink, #0f172a)",
											}}
										>
											Структура разделов формы 043/у (Приказ Минздрава № 834н):
										</div>
										<div
											style={{
												display: "grid",
												gridTemplateColumns:
													"repeat(auto-fit, minmax(280px, 1fr))",
												gap: "8px",
											}}
										>
											{visit.completeness.sections.map((sec) => (
												<div
													key={sec.sectionId}
													style={{
														padding: "8px 10px",
														borderRadius: "6px",
														border: sec.isComplete
															? "1px solid rgba(16, 185, 129, 0.3)"
															: "1px solid rgba(239, 68, 68, 0.3)",
														background: sec.isComplete
															? "rgba(16, 185, 129, 0.04)"
															: "rgba(239, 68, 68, 0.04)",
														fontSize: "12px",
													}}
												>
													<div
														style={{
															display: "flex",
															alignItems: "center",
															justifyContent: "space-between",
															marginBottom: "2px",
														}}
													>
														<span
															style={{
																fontWeight: 600,
																color: sec.isComplete
																	? "var(--good, #10b981)"
																	: "var(--bad, #ef4444)",
															}}
														>
															{sec.isComplete ? "✓" : "⚠️"} {sec.nameRu}
														</span>
														<span
															style={{
																fontSize: "11px",
																color: "var(--ink-2, #64748b)",
															}}
														>
															{sec.earnedScore} / {sec.weightPercent}%
														</span>
													</div>
													{sec.missingDetailsRu.length > 0 && (
														<div
															style={{
																color: "var(--bad, #ef4444)",
																fontSize: "11px",
																marginTop: "2px",
															}}
														>
															{sec.missingDetailsRu.join("; ")}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Rejection Remarks Modal */}
			{rejectionTarget && (
				<RejectionModal
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
