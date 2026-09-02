/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL AUDIT BOARD — CHIEF MEDICAL OFFICER EMR 043/U QUALITY INSPECTION
 * 5-Stage Lifecycle Kanban & Tabular Board (Feature #45)
 *
 * Statutory Compliance:
 * - Order 804n: Medical Services Nomenclature
 * - Order 834n: Outpatient Medical Card 043/u
 * - Order 203n: Quality Criteria of Medical Assistance
 * - Federal Law 323-FZ Art. 20: Informed Voluntary Consent (ИДС)
 * - Federal Law 63-FZ / Order 947n: UKEP Digital Signatures
 *
 * Touch Ergonomics: Min touch targets >= 44x44px, Tokenized CSS variables.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useId, useMemo, useState } from "react";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronRight,
	Clock,
	FileCheck,
	FileText,
	Filter,
	KeyRound,
	LayoutGrid,
	List,
	RotateCcw,
	Search,
	ShieldCheck,
	Sparkles,
	UserCheck,
	X,
} from "lucide-react";
import {
	type AuditRecordFilters,
	type CanonicalAuditStage,
	CANONICAL_AUDIT_STAGES,
	type CmoAuditRemark,
	type EmrAuditRecord,
	type EmrAuditStatus,
	batchApproveCmoRecords,
	filterAuditRecords,
	getCanonicalAuditStage,
	returnRecordForRevision,
} from "./cmoEmrAuditEngine.js";
import {
	CMO_STATUTORY_DEFECT_PRESETS,
	type CmoDefectPreset,
	type CmoDefectSeverity,
} from "./cmoEmrAuditPresets.js";
import "./clinicalAuditBoard.css";

export interface ClinicalAuditBoardProps {
	records: EmrAuditRecord[];
	onUpdateRecord?: ((updated: EmrAuditRecord) => void) | undefined;
	onBatchUpdateRecords?: ((updated: EmrAuditRecord[]) => void) | undefined;
	onOpenDetailedAudit?: ((record: EmrAuditRecord) => void) | undefined;
	currentUserFullName?: string | undefined;
	currentUserRole?: "chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair" | undefined;
	availableCertificates?: Array<{ thumbprint: string; subject: string }> | undefined;
}

export const ClinicalAuditBoard: React.FC<ClinicalAuditBoardProps> = ({
	records,
	onUpdateRecord,
	onBatchUpdateRecords,
	onOpenDetailedAudit,
	currentUserFullName = "Главный врач",
	currentUserRole = "chief_medical_officer",
	availableCertificates = [
		{ thumbprint: "4A7B9C1D2E3F0A1B2C3D4E5F6A7B8C9D0E1F2A3B", subject: "Гл. врач Иванов И.И. (АО 'Клиника ДЕНТЕ', УКЭП ГОСТ Р 34.10-2012)" },
	],
}) => {
	const searchInputId = useId();
	const doctorFilterId = useId();
	const stageFilterId = useId();
	const certSelectId = useId();
	const batchCommentId = useId();
	const returnCommentId = useId();
	// Local view state
	const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
	const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");

	// Selection for batch approval
	const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
	const [selectedCertThumbprint, setSelectedCertThumbprint] = useState(
		availableCertificates[0]?.thumbprint || "",
	);
	const [batchSignComment, setBatchSignComment] = useState("");
	const [batchResultNotification, setBatchResultNotification] = useState<string | null>(null);

	// Return for revision modal state
	const [revisionModalRecord, setRevisionModalRecord] = useState<EmrAuditRecord | null>(null);
	const [revisionComment, setRevisionComment] = useState("");
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
	const [revisionSeverity, setRevisionSeverity] = useState<CmoDefectSeverity>("major");
	const [revisionError, setRevisionError] = useState<string | null>(null);

	// List of unique attending doctors
	const doctorsList = useMemo(() => {
		const map = new Map<string, string>();
		for (const r of records) {
			if (r.doctorStaffId && r.doctorFullName) {
				map.set(r.doctorStaffId, r.doctorFullName);
			}
		}
		return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
	}, [records]);

	// Filtered records
	const filteredRecords = useMemo(() => {
		const filters: AuditRecordFilters = {
			search: searchQuery,
			doctorStaffId: selectedDoctorId === "all" ? undefined : selectedDoctorId,
			status: selectedStageFilter === "all" ? undefined : (selectedStageFilter as EmrAuditStatus),
		};
		return filterAuditRecords(records, filters);
	}, [records, searchQuery, selectedDoctorId, selectedStageFilter]);

	// Grouping by 5 canonical stages for Kanban
	const stageGroups = useMemo(() => {
		const groups: Record<CanonicalAuditStage, EmrAuditRecord[]> = {
			not_filled: [],
			in_progress: [],
			under_review: [],
			revision_required: [],
			approved_by_cmo: [],
		};

		for (const rec of filteredRecords) {
			const stage = getCanonicalAuditStage(rec.status);
			groups[stage].push(rec);
		}

		return groups;
	}, [filteredRecords]);

	// KPI Stats
	const stats = useMemo(() => {
		let totalScore = 0;
		for (const r of records) {
			totalScore += r.automatedQualityScore;
		}
		const avgScore = records.length > 0 ? Math.round(totalScore / records.length) : 100;
		const underReviewCount = records.filter((r) => getCanonicalAuditStage(r.status) === "under_review").length;
		const revisionCount = records.filter((r) => getCanonicalAuditStage(r.status) === "revision_required").length;
		const approvedCount = records.filter((r) => getCanonicalAuditStage(r.status) === "approved_by_cmo").length;

		return {
			total: records.length,
			underReviewCount,
			revisionCount,
			approvedCount,
			avgScore,
		};
	}, [records]);

	// Toggle selection
	const toggleSelectRecord = (id: string) => {
		setSelectedRecordIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAllUnderReview = () => {
		const underReviewIds = records
			.filter((r) => getCanonicalAuditStage(r.status) === "under_review")
			.map((r) => r.id);
		setSelectedRecordIds(new Set(underReviewIds));
	};

	const clearSelection = () => {
		setSelectedRecordIds(new Set());
	};

	// Execute batch approval
	const handleBatchApprove = () => {
		const cert = availableCertificates.find((c) => c.thumbprint === selectedCertThumbprint);
		const result = batchApproveCmoRecords(records, Array.from(selectedRecordIds), {
			auditorFullName: currentUserFullName,
			auditorRole: currentUserRole,
			certificateThumbprint: selectedCertThumbprint,
			certificateSubject: cert?.subject,
			comment: batchSignComment || "Пакетное утверждение амбулаторных карт формы 043/у главным врачом.",
		});

		if (onBatchUpdateRecords) {
			onBatchUpdateRecords(result.approvedRecords);
		}

		setIsBatchModalOpen(false);
		setSelectedRecordIds(new Set());
		setBatchResultNotification(
			`Успешно утверждено: ${result.approvedCount} карт. Пропущено с критическими дефектами: ${result.skippedCount}.`,
		);
		setTimeout(() => setBatchResultNotification(null), 6000);
	};

	// Open return for revision dialog
	const handleOpenRevisionModal = (record: EmrAuditRecord) => {
		setRevisionModalRecord(record);
		setRevisionComment("");
		setSelectedPresetId(null);
		setRevisionSeverity("major");
		setRevisionError(null);
	};

	// Select statutory defect preset
	const handleSelectPreset = (preset: CmoDefectPreset) => {
		setSelectedPresetId(preset.id);
		setRevisionSeverity(preset.severity);
		if (!revisionComment.trim()) {
			setRevisionComment(`[${preset.statutoryReference}] ${preset.title}: ${preset.recommendedAction || preset.description}`);
		}
	};

	// Submit return for revision
	const handleSubmitRevision = () => {
		if (!revisionModalRecord) return;
		const res = returnRecordForRevision(revisionModalRecord, {
			clinicalComment: revisionComment,
			presetId: selectedPresetId ?? undefined,
			severity: revisionSeverity,
			auditorFullName: currentUserFullName,
			auditorRole: currentUserRole,
		});

		if (!res.success) {
			setRevisionError(res.errorMessage || "Ошибка валидации комментария.");
			return;
		}

		if (onUpdateRecord) {
			onUpdateRecord(res.record);
		}

		setRevisionModalRecord(null);
		setRevisionComment("");
		setSelectedPresetId(null);
		setRevisionError(null);
	};

	return (
		<div className="cmo-board-container" data-testid="clinical-audit-board">
			{/* Top Header */}
			<header className="cmo-board-header">
				<div className="cmo-board-title-group">
					<span className="cmo-board-role-badge">
						<ShieldCheck size={16} /> Экспертиза КЭР / ВК (Приказ № 203н)
					</span>
					<div>
						<h1 className="cmo-board-title">Проверка амбулаторных карт 043/у</h1>
						<p className="cmo-board-subtitle">
							Контроль ведения первичной документации главным врачом (Приказы № 804н, 834н, 203н, 323-ФЗ)
						</p>
					</div>
				</div>

				<div className="cmo-board-top-actions">
					<button
						type="button"
						className={`cmo-board-view-btn ${viewMode === "kanban" ? "active" : ""}`}
						onClick={() => setViewMode("kanban")}
						title="Вид канбан-доски"
					>
						<LayoutGrid size={16} /> Канбан
					</button>
					<button
						type="button"
						className={`cmo-board-view-btn ${viewMode === "table" ? "active" : ""}`}
						onClick={() => setViewMode("table")}
						title="Табличный реестр"
					>
						<List size={16} /> Таблица
					</button>
				</div>
			</header>

			{/* Notification Banner */}
			{batchResultNotification && (
				<div
					style={{
						padding: "0.75rem 1rem",
						borderRadius: "8px",
						background: "rgba(13, 148, 136, 0.12)",
						border: "1px solid var(--teal)",
						color: "var(--teal)",
						fontWeight: 700,
						fontSize: "0.875rem",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
					}}
				>
					<CheckCircle2 size={18} />
					{batchResultNotification}
				</div>
			)}

			{/* KPI Summary Cards */}
			<div className="cmo-board-kpi-bar">
				<div className="cmo-board-kpi-card">
					<span className="cmo-board-kpi-label">Всего карт в реестре</span>
					<div className="cmo-board-kpi-val-row">
						<span className="cmo-board-kpi-val">{stats.total}</span>
						<span className="cmo-board-kpi-sub">форм 043/у</span>
					</div>
				</div>
				<div className="cmo-board-kpi-card">
					<span className="cmo-board-kpi-label">На проверке начмеда</span>
					<div className="cmo-board-kpi-val-row">
						<span className="cmo-board-kpi-val" style={{ color: "var(--teal)" }}>
							{stats.underReviewCount}
						</span>
						<span className="cmo-board-kpi-sub">ожидают решения</span>
					</div>
				</div>
				<div className="cmo-board-kpi-card">
					<span className="cmo-board-kpi-label">На доработке у врача</span>
					<div className="cmo-board-kpi-val-row">
						<span className="cmo-board-kpi-val" style={{ color: "var(--bad-fg)" }}>
							{stats.revisionCount}
						</span>
						<span className="cmo-board-kpi-sub">с замечаниями</span>
					</div>
				</div>
				<div className="cmo-board-kpi-card">
					<span className="cmo-board-kpi-label">Утверждено главврачом</span>
					<div className="cmo-board-kpi-val-row">
						<span className="cmo-board-kpi-val" style={{ color: "var(--ok-fg)" }}>
							{stats.approvedCount}
						</span>
						<span className="cmo-board-kpi-sub">подписано ЭЦП</span>
					</div>
				</div>
				<div className="cmo-board-kpi-card">
					<span className="cmo-board-kpi-label">Средний балл качества</span>
					<div className="cmo-board-kpi-val-row">
						<span className="cmo-board-kpi-val">{stats.avgScore}%</span>
						<span className="cmo-board-kpi-sub">по Приказу 203н</span>
					</div>
				</div>
			</div>

			{/* Filter and Search Bar */}
			<div className="cmo-board-toolbar">
				<div className="cmo-board-toolbar-left">
					<div className="cmo-board-search-box">
						<Search size={16} className="cmo-board-search-icon" />
						<input
							id={searchInputId}
							type="text"
							className="cmo-board-search-input"
							placeholder="Поиск по пациенту, карте, врачу или МКБ-10..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					<select
						id={doctorFilterId}
						className="cmo-board-select"
						value={selectedDoctorId}
						onChange={(e) => setSelectedDoctorId(e.target.value)}
						aria-label="Фильтр по лечащему врачу"
					>
						<option value="all">Все лечащие врачи</option>
						{doctorsList.map((doc) => (
							<option key={doc.id} value={doc.id}>
								{doc.name}
							</option>
						))}
					</select>

					<select
						id={stageFilterId}
						className="cmo-board-select"
						value={selectedStageFilter}
						onChange={(e) => setSelectedStageFilter(e.target.value)}
						aria-label="Фильтр по этапу проверки"
					>
						<option value="all">Все этапы жизненного цикла</option>
						{CANONICAL_AUDIT_STAGES.map((s) => (
							<option key={s.key} value={s.key}>
								{s.title}
							</option>
						))}
					</select>
				</div>

				<div className="cmo-board-toolbar-right">
					<button
						type="button"
						className="cmo-board-view-btn"
						onClick={selectAllUnderReview}
						title="Выбрать все карты на проверке для пакетного подписания"
					>
						<CheckCircle2 size={16} /> Выбрать «На проверке»
					</button>
				</div>
			</div>

			{/* Kanban View */}
			{viewMode === "kanban" && (
				<div className="cmo-kanban-grid">
					{CANONICAL_AUDIT_STAGES.map((stage) => {
						const colRecords = stageGroups[stage.key];
						return (
							<section key={stage.key} className="cmo-kanban-column" aria-label={stage.title}>
								<div className="cmo-kanban-column-header">
									<div className="cmo-kanban-column-title-wrap">
										<h2 className="cmo-kanban-column-title">{stage.title}</h2>
									</div>
									<span className="cmo-kanban-column-badge">{colRecords.length}</span>
								</div>

								<div className="cmo-kanban-card-list">
									{colRecords.length === 0 ? (
										<div className="cmo-kanban-empty">
											<FileText size={28} />
											<span>Нет карт в статусе «{stage.title}»</span>
										</div>
									) : (
										colRecords.map((rec) => {
											const isSelected = selectedRecordIds.has(rec.id);
											const scoreColor =
												rec.automatedQualityScore >= 90
													? "green"
													: rec.automatedQualityScore >= 70
														? "yellow"
														: "red";

											const icdPass = rec.automatedCheckResults.find((c) => c.ruleId === "AUTO-ICD-01")?.passed !== false;
											const soapPass = rec.automatedCheckResults.find((c) => c.ruleId === "AUTO-SOAP-01")?.passed !== false;
											const idsPass = rec.automatedCheckResults.find((c) => c.ruleId === "AUTO-IDS-01")?.passed !== false;
											const anesPass = rec.automatedCheckResults.find((c) => c.ruleId === "AUTO-ANES-01")?.passed !== false;

											return (
												<div
													key={rec.id}
													className={`cmo-emr-card ${isSelected ? "selected" : ""}`}
												>
													<div className="cmo-emr-card-header">
														<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
															<input
																type="checkbox"
																checked={isSelected}
																onChange={() => toggleSelectRecord(rec.id)}
																style={{ width: "18px", height: "18px", cursor: "pointer" }}
																aria-label={`Выбрать карту ${rec.medicalCardId}`}
															/>
															<span className="cmo-emr-card-cardnum">
																№ {rec.medicalCardId}
															</span>
														</div>
														<span className={`cmo-emr-card-score ${scoreColor}`}>
															{rec.automatedQualityScore} б.
														</span>
													</div>

													<div className="cmo-emr-card-patient">{rec.patientFullName}</div>

													<div className="cmo-emr-card-meta">
														<span>Врач: {rec.doctorFullName}</span>
														<span>Приём: {rec.visitDate}</span>
													</div>

													<div className="cmo-emr-card-diag">
														<strong>{rec.cardData.passport.primaryDiagnosisIcd10 || "МКБ не указан"}</strong>:{" "}
														{rec.cardData.passport.primaryDiagnosisText || "Клинический диагноз не заполнен"}
													</div>

													{/* Statutory Checklist Pills */}
													<div className="cmo-emr-check-pills">
														<span className={`cmo-check-pill ${icdPass ? "ok" : "bad"}`}>
															{icdPass ? "✓" : "✗"} МКБ-10
														</span>
														<span className={`cmo-check-pill ${idsPass ? "ok" : "bad"}`}>
															{idsPass ? "✓" : "✗"} ИДС 323-ФЗ
														</span>
														<span className={`cmo-check-pill ${soapPass ? "ok" : "bad"}`}>
															{soapPass ? "✓" : "✗"} SOAP Дневник
														</span>
														<span className={`cmo-check-pill ${anesPass ? "ok" : "bad"}`}>
															{anesPass ? "✓" : "✗"} Анестезия
														</span>
													</div>

													{/* Card Actions (Touch targets >= 44px) */}
													<div className="cmo-emr-card-actions">
														<button
															type="button"
															className="cmo-card-btn cmo-card-btn-secondary"
															onClick={() => onOpenDetailedAudit && onOpenDetailedAudit(rec)}
															title="Открыть экспертную карту аудита формы 043/у"
														>
															<FileCheck size={14} /> Экспертиза
														</button>

														{stage.key === "under_review" && (
															<button
																type="button"
																className="cmo-card-btn cmo-card-btn-reject"
																onClick={() => handleOpenRevisionModal(rec)}
																title="Вернуть карту врачу на доработку"
															>
																<RotateCcw size={14} /> На доработку
															</button>
														)}
													</div>
												</div>
											);
										})
									)}
								</div>
							</section>
						);
					})}
				</div>
			)}

			{/* Tabular View */}
			{viewMode === "table" && (
				<div className="cmo-board-table-wrap">
					<table className="cmo-board-table">
						<thead>
							<tr>
								<th style={{ width: "40px" }}>
									<input
										type="checkbox"
										checked={selectedRecordIds.size > 0 && selectedRecordIds.size === filteredRecords.length}
										onChange={() => {
											if (selectedRecordIds.size === filteredRecords.length) clearSelection();
											else setSelectedRecordIds(new Set(filteredRecords.map((r) => r.id)));
										}}
										style={{ width: "18px", height: "18px", cursor: "pointer" }}
										aria-label="Выбрать все карты в таблице"
									/>
								</th>
								<th>№ Карты</th>
								<th>Пациент</th>
								<th>Лечащий врач</th>
								<th>Диагноз МКБ-10</th>
								<th>Стадия проверки</th>
								<th>Критерии 203н</th>
								<th>Балл</th>
								<th style={{ textAlign: "right" }}>Действия</th>
							</tr>
						</thead>
						<tbody>
							{filteredRecords.length === 0 ? (
								<tr>
									<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
										Карты по заданным критериям фильтрации не найдены.
									</td>
								</tr>
							) : (
								filteredRecords.map((rec) => {
									const stage = getCanonicalAuditStage(rec.status);
									const stageMeta = CANONICAL_AUDIT_STAGES.find((s) => s.key === stage);
									const isSelected = selectedRecordIds.has(rec.id);
									const scoreColor =
										rec.automatedQualityScore >= 90
											? "green"
											: rec.automatedQualityScore >= 70
												? "yellow"
												: "red";

									return (
										<tr key={rec.id}>
											<td>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleSelectRecord(rec.id)}
													style={{ width: "18px", height: "18px", cursor: "pointer" }}
													aria-label={`Выбрать ${rec.medicalCardId}`}
												/>
											</td>
											<td>
												<strong>№ {rec.medicalCardId}</strong>
												<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													от {rec.visitDate}
												</div>
											</td>
											<td>
												<strong>{rec.patientFullName}</strong>
												<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													{rec.patientBirthDate}
												</div>
											</td>
											<td>
												{rec.doctorFullName}
												<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													{rec.doctorSpecialty}
												</div>
											</td>
											<td>
												<span style={{ fontWeight: 700, color: "var(--teal)" }}>
													{rec.cardData.passport.primaryDiagnosisIcd10 || "—"}
												</span>{" "}
												<span style={{ fontSize: "0.75rem" }}>
													{rec.cardData.passport.primaryDiagnosisText}
												</span>
											</td>
											<td>
												<span
													style={{
														display: "inline-flex",
														alignItems: "center",
														padding: "0.25rem 0.5rem",
														borderRadius: "4px",
														fontSize: "0.75rem",
														fontWeight: 700,
														background: "var(--paper)",
														border: "1px solid var(--line)",
													}}
												>
													{stageMeta?.title || stage}
												</span>
											</td>
											<td>
												<span style={{ fontSize: "0.75rem", fontWeight: 600 }}>
													{rec.automatedCheckResults.filter((c) => c.passed).length}/
													{rec.automatedCheckResults.length} пройдено
												</span>
											</td>
											<td>
												<span className={`cmo-emr-card-score ${scoreColor}`}>
													{rec.automatedQualityScore} б.
												</span>
											</td>
											<td style={{ textAlign: "right" }}>
												<div style={{ display: "inline-flex", gap: "0.35rem" }}>
													<button
														type="button"
														className="cmo-card-btn cmo-card-btn-secondary"
														style={{ minHeight: "44px", minWidth: "44px", padding: "0 0.75rem" }}
														onClick={() => onOpenDetailedAudit && onOpenDetailedAudit(rec)}
														title="Открыть подробную экспертизу"
													>
														Экспертиза
													</button>
													{stage === "under_review" && (
														<button
															type="button"
															className="cmo-card-btn cmo-card-btn-reject"
															style={{ minHeight: "44px", minWidth: "44px", padding: "0 0.75rem" }}
															onClick={() => handleOpenRevisionModal(rec)}
															title="Направить врачу на доработку"
														>
															Доработка
														</button>
													)}
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}

			{/* Floating Batch Approval HUD Bar (Touch target >= 44px) */}
			{selectedRecordIds.size > 0 && (
				<div className="cmo-batch-hud-bar">
					<div className="cmo-batch-hud-info">
						<span className="cmo-batch-hud-count">{selectedRecordIds.size}</span>
						<div>
							<div style={{ fontWeight: 800, fontSize: "0.875rem", color: "var(--ink)" }}>
								Выбрано карт для пакетной обработки
							</div>
							<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
								Утверждение и наложение усиленной квалифицированной электронной подписи (УКЭП)
							</div>
						</div>
					</div>

					<div className="cmo-batch-hud-actions">
						<button
							type="button"
							className="cmo-card-btn cmo-card-btn-secondary"
							onClick={clearSelection}
							style={{ minHeight: "44px", padding: "0 1rem" }}
						>
							Снять выбор
						</button>
						<button
							type="button"
							className="cmo-card-btn cmo-card-btn-approve"
							onClick={() => setIsBatchModalOpen(true)}
							style={{ minHeight: "44px", padding: "0 1.25rem", fontSize: "0.875rem" }}
						>
							<KeyRound size={16} /> Утвердить пакет ({selectedRecordIds.size}) с ЭЦП
						</button>
					</div>
				</div>
			)}

			{/* Batch UKEP Approval Modal */}
			{isBatchModalOpen && (
				<div className="cmo-revision-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="batch-modal-title">
					<div className="cmo-revision-modal-card" style={{ maxWidth: "560px" }}>
						<div
							className="cmo-revision-modal-header"
							style={{ background: "rgba(13, 148, 136, 0.08)", borderColor: "var(--teal)" }}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<KeyRound size={20} color="var(--teal)" />
								<h3 id="batch-modal-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
									Пакетное утверждение проверенных карт 043/у
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsBatchModalOpen(false)}
								style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
								aria-label="Закрыть"
							>
								<X size={20} />
							</button>
						</div>

						<div className="cmo-revision-modal-body">
							<div style={{ fontSize: "0.875rem", color: "var(--ink)", lineHeight: 1.5 }}>
								Будет утверждено <strong>{selectedRecordIds.size} карт</strong> формы 043/у. На каждую карту будет наложен цифровой штамп ЭЦП главного врача и создана запись в журнале аудита КЭР.
							</div>

							<div>
								<label htmlFor={certSelectId} style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.35rem" }}>
									Сертификат ЭЦП (КриптоПро CSP ГОСТ Р 34.10-2012):
								</label>
								<select
									id={certSelectId}
									className="cmo-board-select"
									style={{ width: "100%" }}
									value={selectedCertThumbprint}
									onChange={(e) => setSelectedCertThumbprint(e.target.value)}
								>
									{availableCertificates.map((cert) => (
										<option key={cert.thumbprint} value={cert.thumbprint}>
											{cert.subject}
										</option>
									))}
								</select>
							</div>

							<div>
								<label htmlFor={batchCommentId} style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.35rem" }}>
									Комментарий / Примечание к пакетному протоколу:
								</label>
								<input
									id={batchCommentId}
									type="text"
									className="cmo-board-search-input"
									placeholder="Пакетная проверка за смену. Замечаний нет."
									value={batchSignComment}
									onChange={(e) => setBatchSignComment(e.target.value)}
								/>
							</div>
						</div>

						<div className="cmo-revision-modal-footer">
							<button
								type="button"
								className="cmo-card-btn cmo-card-btn-secondary"
								onClick={() => setIsBatchModalOpen(false)}
								style={{ minHeight: "44px", padding: "0 1rem" }}
							>
								Отмена
							</button>
							<button
								type="button"
								className="cmo-card-btn cmo-card-btn-approve"
								onClick={handleBatchApprove}
								style={{ minHeight: "44px", padding: "0 1.25rem" }}
							>
								<FileCheck size={16} /> Подписать и утвердить ({selectedRecordIds.size})
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal for Returning Record for Revision */}
			{revisionModalRecord && (
				<div className="cmo-revision-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="revision-modal-title">
					<div className="cmo-revision-modal-card">
						<div className="cmo-revision-modal-header">
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<AlertTriangle size={20} color="var(--bad-fg)" />
								<h3 id="revision-modal-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
									Возврат карты № {revisionModalRecord.medicalCardId} на доработку
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setRevisionModalRecord(null)}
								style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
								aria-label="Закрыть"
							>
								<X size={20} />
							</button>
						</div>

						<div className="cmo-revision-modal-body">
							<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
								Пациент: <strong>{revisionModalRecord.patientFullName}</strong> | Врач:{" "}
								<strong>{revisionModalRecord.doctorFullName}</strong>
							</div>

							{/* Presets Selector */}
							<div>
								<span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.35rem" }}>
									Выберите типовой дефект Росздравнадзора (Приказ № 203н):
								</span>
								<div className="cmo-preset-chips-wrap">
									{CMO_STATUTORY_DEFECT_PRESETS.map((preset) => (
										<button
											key={preset.id}
											type="button"
											className={`cmo-preset-chip-btn ${selectedPresetId === preset.id ? "active" : ""}`}
											onClick={() => handleSelectPreset(preset)}
										>
											{preset.title}
										</button>
									))}
								</div>
							</div>

							{/* Mandatory Comment Textarea */}
							<div>
								<label htmlFor={returnCommentId} style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.35rem" }}>
									Обязательный клинический комментарий эксперта (минимум 5 символов):
								</label>
								<textarea
									id={returnCommentId}
									className="cmo-board-search-input"
									style={{
										height: "90px",
										minHeight: "90px",
										padding: "0.5rem 0.75rem",
										resize: "vertical",
										fontFamily: "inherit",
									}}
									placeholder="Укажите конкретный дефект и необходимые действия врача по исправлению карты..."
									value={revisionComment}
									onChange={(e) => {
										setRevisionComment(e.target.value);
										if (revisionError) setRevisionError(null);
									}}
								/>
								{revisionError && (
									<div style={{ color: "var(--bad-fg)", fontSize: "0.75rem", fontWeight: 700, marginTop: "0.25rem" }}>
										{revisionError}
									</div>
								)}
							</div>
						</div>

						<div className="cmo-revision-modal-footer">
							<button
								type="button"
								className="cmo-card-btn cmo-card-btn-secondary"
								onClick={() => setRevisionModalRecord(null)}
								style={{ minHeight: "44px", padding: "0 1rem" }}
							>
								Отмена
							</button>
							<button
								type="button"
								className="cmo-card-btn cmo-card-btn-reject"
								onClick={handleSubmitRevision}
								disabled={revisionComment.trim().length < 5}
								style={{ minHeight: "44px", padding: "0 1.25rem" }}
							>
								<RotateCcw size={16} /> Направить врачу на доработку
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ClinicalAuditBoard;
