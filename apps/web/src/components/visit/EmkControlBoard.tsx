import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	FileText,
	RotateCcw,
	UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatShortDate } from "../../AppHelpers";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { logger } from "../../utils/logger";
import { EmptyState } from "../EmptyState";

/**
 * Форма снята с маршрута, а не придумана: `routes/integrations/diagnocat.ts:41`
 * делает `select()` по всей таблице и отвечает `{ success, reports }`.
 * Отрисовка читает три поля — `id`, `reportUrl`, `createdAt`.
 */
type DiagnocatReport = {
	readonly id: string;
	readonly reportUrl: string;
	readonly createdAt: string | null;
};

function DiagnocatReportWidget({ patientId }: { patientId: string }) {
	const [reports, setReports] = useState<DiagnocatReport[]>([]);
	/*
	 * ОТКАЗ ОБЯЗАН БЫТЬ ВИДЕН. Прежде состояние было `any[]`, ответ не
	 * проверялся на `res.ok`, а отказ уходил в `logger.error` — при пустом
	 * списке виджет возвращает `null`, поэтому 403, 500 и «таблицы нет»
	 * выглядели на экране ОДИНАКОВО с «отчётов не найдено». Врач не мог
	 * отличить отсутствие снимков от неработающей интеграции.
	 */
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
			<div style={{ color: "var(--red-dark)", fontSize: 13 }}>
				<AlertTriangle size={14} /> {loadError}
			</div>
		);
	}

	if (reports.length === 0) return null;

	return (
		<div
			style={{
				marginTop: "8px",
				padding: "8px 10px",
				background: "var(--teal-soft)",
				border: "1px solid var(--teal-light)",
				borderRadius: "6px",
				fontSize: "13px",
				color: "var(--teal-dark)",
				display: "flex",
				alignItems: "center",
				gap: "8px",
			}}
		>
			<Activity size={14} />
			<span>
				<strong>Diagnocat AI:</strong> {reports.length} отч.
			</span>
			<div style={{ marginLeft: "auto", display: "flex", gap: "6px", flexWrap: "wrap" }}>
				{reports.map((r, reportIdx) => (
					<a
						key={r.id || r.reportUrl || `report-item-${r.createdAt || reportIdx}`}
						href={r.reportUrl}
						target="_blank"
						rel="noreferrer"
						style={{
							color: "var(--teal-dark)",
							textDecoration: "underline",
							fontWeight: 500,
						}}
					>
						#{reportIdx + 1}
					</a>
				))}
			</div>
		</div>
	);
}

type VisitQcType = "not_filled" | "draft" | "under_review" | "needs_correction" | "approved" | "rejected";

interface VisitQcItem {
	id: string;
	visitId?: string;
	type: VisitQcType;
	patientId?: string;
	patientName?: string;
	doctorId?: string;
	doctorName?: string;
	createdAt?: string;
	complaint?: string;
	anamnesis?: string;
	objectiveStatus?: string;
	diagnosis?: string;
	treatmentPlan?: string;
}

const STATUS_LABEL: Record<VisitQcType, string> = {
	not_filled: "Не заполнен",
	draft: "Черновик",
	under_review: "На проверке",
	needs_correction: "Возвращён на доработку",
	approved: "Одобрен",
	rejected: "Отклонён",
};

const STATUS_COLOR: Record<VisitQcType, { bg: string; color: string }> = {
	not_filled: { bg: "#f1f5f9", color: "#64748b" },
	draft: { bg: "#f1f5f9", color: "#64748b" },
	under_review: { bg: "#eff6ff", color: "#2563eb" },
	needs_correction: { bg: "#fff7ed", color: "#c2410c" },
	approved: { bg: "#f0fdf4", color: "#15803d" },
	rejected: { bg: "#fef2f2", color: "#b91c1c" },
};

function VisitQcCard({
	visit,
	submittingId,
	onAction,
}: {
	visit: VisitQcItem;
	submittingId: string | null;
	onAction: (id: string, status: string) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const statusStyle = STATUS_COLOR[visit.type] ?? STATUS_COLOR.draft;
	const isBusy = submittingId === visit.id;
	const isNotFilled = visit.type === "not_filled";
	const hasExtraFields =
		visit.anamnesis || visit.objectiveStatus || visit.treatmentPlan;

	return (
		<div
			style={{
				border: "1px solid var(--line)",
				borderRadius: "10px",
				background: "var(--paper)",
				overflow: "hidden",
			}}
		>
			{/* Шапка карточки */}
			<div
				style={{
					padding: "12px 16px",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					gap: "12px",
					borderBottom: expanded ? "1px solid var(--line)" : "none",
				}}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					{/* Статус-бейдж */}
					<span
						style={{
							display: "inline-block",
							padding: "2px 8px",
							borderRadius: "9999px",
							fontSize: "11px",
							fontWeight: 600,
							marginBottom: "6px",
							background: statusStyle.bg,
							color: statusStyle.color,
						}}
					>
						{STATUS_LABEL[visit.type]}
					</span>

					{/* Пациент */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "5px",
							fontSize: "14px",
							fontWeight: 600,
							marginBottom: "2px",
						}}
					>
						<UserRound size={14} style={{ flexShrink: 0 }} />
						<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
							{visit.patientName || "Пациент не определён"}
						</span>
					</div>

					{/* Врач + дата */}
					<div style={{ fontSize: "12px", color: "var(--ink-2)" }}>
						{visit.doctorName && (
							<span style={{ marginRight: "8px" }}>Врач: {visit.doctorName}</span>
						)}
						{visit.createdAt && (
							<span>{formatShortDate(visit.createdAt)}</span>
						)}
					</div>

					{/* Жалоба (всегда видна, если есть) */}
					{visit.complaint && (
						<p
							style={{
								margin: "6px 0 0",
								fontSize: "13px",
								color: "var(--ink-1)",
								overflow: "hidden",
								display: "-webkit-box",
								WebkitLineClamp: expanded ? undefined : 2,
								WebkitBoxOrient: "vertical",
							}}
						>
							<strong>Жалобы:</strong> {visit.complaint}
						</p>
					)}
					{visit.diagnosis && (
						<p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--ink-1)" }}>
							<strong>Диагноз:</strong> {visit.diagnosis}
						</p>
					)}

					{/* Кнопка раскрытия ЭМК */}
					{hasExtraFields && (
						<button
							type="button"
							onClick={() => setExpanded((v) => !v)}
							style={{
								marginTop: "6px",
								background: "none",
								border: "none",
								cursor: "pointer",
								fontSize: "12px",
								color: "var(--teal-dark)",
								display: "flex",
								alignItems: "center",
								gap: "4px",
								padding: 0,
							}}
						>
							{expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
							{expanded ? "Скрыть ЭМК" : "Показать ЭМК"}
						</button>
					)}

					{/* Diagnocat */}
					{visit.patientId && <DiagnocatReportWidget patientId={visit.patientId} />}
				</div>

				{/* Кнопки действий — только для визитов, не для «не заполнен» */}
				{!isNotFilled && (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							flexShrink: 0,
						}}
					>
						<button
							id={`emk-approve-${visit.id}`}
							type="button"
							className="primary-button focus:outline-none focus:ring-2 focus:ring-teal-600"
							style={{ fontSize: "12px", padding: "5px 10px" }}
							onClick={() => onAction(visit.id, "approved")}
							disabled={isBusy}
							aria-busy={isBusy}
						>
							<CheckCircle2 size={14} /> Одобрить
						</button>
						<button
							id={`emk-return-${visit.id}`}
							type="button"
							className="secondary-button focus:outline-none focus:ring-2 focus:ring-orange-500"
							style={{
								fontSize: "12px",
								padding: "5px 10px",
								borderColor: "var(--amber-soft, #fbbf24)",
								color: "var(--amber-dark, #92400e)",
							}}
							onClick={() => onAction(visit.id, "needs_correction")}
							disabled={isBusy}
							aria-busy={isBusy}
						>
							<RotateCcw size={14} /> На доработку
						</button>
					</div>
				)}
			</div>

			{/* Раскрываемая секция ЭМК */}
			{expanded && hasExtraFields && (
				<div
					style={{
						padding: "12px 16px",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						fontSize: "13px",
						color: "var(--ink-1)",
						background: "var(--surface-2, #f8fafc)",
					}}
				>
					{visit.anamnesis && (
						<div>
							<strong>Анамнез:</strong>
							<p style={{ margin: "2px 0 0" }}>{visit.anamnesis}</p>
						</div>
					)}
					{visit.objectiveStatus && (
						<div>
							<strong>Объективный статус:</strong>
							<p style={{ margin: "2px 0 0" }}>{visit.objectiveStatus}</p>
						</div>
					)}
					{visit.treatmentPlan && (
						<div>
							<strong>План лечения / выполнено:</strong>
							<p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{visit.treatmentPlan}</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// biome-ignore lint/suspicious/noExplicitAny lint/correctness/noUnusedFunctionParameters: automated suppression
export function EmkControlBoard({ dashboard }: any) {
	const [visits, setVisits] = useState<VisitQcItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [submittingId, setSubmittingId] = useState<string | null>(null);

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
			setVisits(data.visits || []);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			setError(err.message || "Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadVisits();
	}, [loadVisits]);

	async function updateStatus(visitId: string, status: string) {
		if (submittingId) return;
		try {
			setSubmittingId(visitId);
			const res = await fetch(`/api/visits/${visitId}/quality-control`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ status }),
			});
			if (!res.ok) {
				throw new Error("Не удалось обновить статус");
			}
			await loadVisits();
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			setError(err.message || "Ошибка обновления");
		} finally {
			setSubmittingId(null);
		}
	}

	if (loading) {
		return <div className="p-4">Загрузка приемов на проверку...</div>;
	}

	if (error) {
		return <div className="p-4 text-red-600">{error}</div>;
	}

	// Считаем по группам — только те, что реально нужны
	const needsAction = visits.filter(
		(v) => v.type === "under_review" || v.type === "needs_correction",
	);
	const notFilled = visits.filter((v) => v.type === "not_filled");

	if (visits.length === 0) {
		return (
			<EmptyState
				icon={<CheckCircle2 size={32} />}
				title="Все ЭМК проверены"
				description="Нет приемов, ожидающих контроля качества."
				glass={false}
			/>
		);
	}

	return (
		<div
			className="emk-control-board p-4"
			style={{ display: "flex", flexDirection: "column", gap: "20px" }}
		>
			<h2
				style={{
					fontSize: "17px",
					fontWeight: "600",
					display: "flex",
					alignItems: "center",
					gap: "8px",
					margin: 0,
				}}
			>
				<Activity size={18} />
				Проверка историй болезни главврачом
				{needsAction.length > 0 && (
					<span
						style={{
							marginLeft: "6px",
							background: "#2563eb",
							color: "#fff",
							borderRadius: "9999px",
							fontSize: "11px",
							fontWeight: 700,
							padding: "1px 7px",
						}}
					>
						{needsAction.length}
					</span>
				)}
			</h2>

			{/* Раздел: подписанные, ждут проверки */}
			{needsAction.length > 0 && (
				<section>
					<h3
						style={{
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ink-2)",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
							margin: "0 0 8px",
						}}
					>
						Ожидают решения ({needsAction.length})
					</h3>
					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						{needsAction.map((visit) => (
							<VisitQcCard
								key={visit.id}
								visit={visit}
								submittingId={submittingId}
								onAction={updateStatus}
							/>
						))}
					</div>
				</section>
			)}

			{/* Раздел: приёмы без ЭМК */}
			{notFilled.length > 0 && (
				<section>
					<h3
						style={{
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ink-2)",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
							margin: "0 0 8px",
						}}
					>
						<FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
						ЭМК не заполнена ({notFilled.length})
					</h3>
					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						{notFilled.map((visit) => (
							<VisitQcCard
								key={visit.id}
								visit={visit}
								submittingId={submittingId}
								onAction={updateStatus}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
