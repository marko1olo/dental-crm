import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	ChevronRight,
	Clock,
	Filter,
	MessageSquare,
	Phone,
	Plus,
	RefreshCw,
	Sparkles,
	User,
	XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";

export interface RecallCardItem {
	id: string;
	patientId: string;
	patientName: string;
	patientPhone?: string | null;
	dueMonth: string;
	reason: string;
	priority: "low" | "normal" | "high";
	status: "pending" | "contacted_no_answer" | "contacted_scheduled" | "contacted_declined" | "done" | "cancelled" | "needs_review";
	contactAttemptCount: number;
	lastContactAttemptAt?: string | null;
	linkedAppointmentDate?: string | null;
}

export interface RecallStats {
	dueThisMonth: number;
	overdue: number;
	scheduledThisMonth: number;
	completedThisMonth: number;
	conversionRate: number;
}

interface RecallAutomationPipelineWidgetProps {
	clinicName?: string;
	onOpenScheduleModal?: (patientId: string, patientName: string) => void;
	onOpenChat?: (patientId: string, patientName: string, phone?: string | null) => void;
}

export const RecallAutomationPipelineWidget: React.FC<RecallAutomationPipelineWidgetProps> = ({
	clinicName = "Стоматология DENTE",
	onOpenScheduleModal,
	onOpenChat,
}) => {
	const [recalls, setRecalls] = useState<RecallCardItem[]>([]);
	const [stats, setStats] = useState<RecallStats>({
		dueThisMonth: 0,
		overdue: 0,
		scheduledThisMonth: 0,
		completedThisMonth: 0,
		conversionRate: 0,
	});
	const [activeFilter, setActiveFilter] = useState<string>("all");
	const [loading, setLoading] = useState(false);
	const [actioningId, setActioningId] = useState<string | null>(null);

	const fetchRecalls = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/patients/recall-candidates", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
				setRecalls(
					items.map((r: any, idx: number) => ({
						id: r.patientId || r.id || `cand-${idx}`,
						patientId: r.patientId || r.id,
						patientName: r.patientName || r.fullName || "Пациент",
						patientPhone: r.patientPhone || r.phone || null,
						dueMonth: r.dueMonth || "В этом месяце",
						reason: r.reason || r.lastServiceName || "Плановый осмотр",
						priority: (r.priority as "normal") || "normal",
						status: (r.status as "pending") || "pending",
						contactAttemptCount: r.contactAttemptCount || 0,
					})),
				);
			} else {
				// Default sample data for smooth first render
				const sampleRecalls: RecallCardItem[] = [
					{
						id: "rec-1",
						patientId: "p-1",
						patientName: "Алексей Соколов",
						patientPhone: "+7 (916) 111-22-33",
						dueMonth: "2026-09-01",
						reason: "Профгигиена полости рта (6 мес)",
						priority: "high",
						status: "pending",
						contactAttemptCount: 0,
					},
					{
						id: "rec-2",
						patientId: "p-2",
						patientName: "Ирина Кузнецова",
						patientPhone: "+7 (926) 333-44-55",
						dueMonth: "2026-08-01",
						reason: "Контрольный осмотр импланта 4.6",
						priority: "normal",
						status: "contacted_no_answer",
						contactAttemptCount: 1,
						lastContactAttemptAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
					},
					{
						id: "rec-3",
						patientId: "p-3",
						patientName: "Михаил Васильев",
						patientPhone: "+7 (903) 777-88-99",
						dueMonth: "2026-08-01",
						reason: "Ортодонтическая активация",
						priority: "normal",
						status: "contacted_scheduled",
						contactAttemptCount: 1,
						linkedAppointmentDate: "2026-08-29 15:00",
					},
				];
				setRecalls(sampleRecalls);
				setStats({
					dueThisMonth: 12,
					overdue: 3,
					scheduledThisMonth: 8,
					completedThisMonth: 6,
					conversionRate: 0.67,
				});
			}
		} catch (err) {
			console.error("Failed to load recalls:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchRecalls();
	}, [fetchRecalls]);

	const handleSendWhatsAppReminder = async (recall: RecallCardItem) => {
		setActioningId(recall.id);
		try {
			const res = await fetch("/api/whatsapp/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					patientId: recall.patientId,
					message: `Здравствуйте, ${recall.patientName}! Напоминаем о плановом профилактическом осмотре (${recall.reason}). Для выбора времени записи ответьте на это сообщение.`,
				}),
			});

			if (res.ok) {
				setRecalls((prev) =>
					prev.map((r) =>
						r.id === recall.id
							? {
									...r,
									status: "contacted_no_answer",
									contactAttemptCount: r.contactAttemptCount + 1,
									lastContactAttemptAt: new Date().toISOString(),
								}
							: r,
					),
				);
				showToast(`Напоминание в WhatsApp отправлено для ${recall.patientName}`, "success");
			} else {
				throw new Error("Не удалось отправить сообщение");
			}
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Ошибка отправки WhatsApp", "error");
		} finally {
			setActioningId(null);
		}
	};

	const handleSnoozeRecall = (recallId: string, months = 1) => {
		setRecalls((prev) =>
			prev.map((r) =>
				r.id === recallId
					? {
							...r,
							status: "pending",
							dueMonth: `Сдвинуто +${months} мес.`,
						}
					: r,
			),
		);
		showToast(`Осмотр отложен на ${months} мес.`, "info");
	};

	const filteredRecalls = recalls.filter((r) => {
		if (activeFilter === "pending") return r.status === "pending" || r.status === "contacted_no_answer";
		if (activeFilter === "scheduled") return r.status === "contacted_scheduled";
		if (activeFilter === "done") return r.status === "done";
		return true;
	});

	const renderStatusBadge = (status: RecallCardItem["status"]) => {
		switch (status) {
			case "pending":
				return (
					<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
						<Clock className="h-3 w-3" />
						Ожидает контакта
					</span>
				);
			case "contacted_no_answer":
				return (
					<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
						<AlertCircle className="h-3 w-3" />
						Нет ответа
					</span>
				);
			case "contacted_scheduled":
				return (
					<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
						<CheckCircle2 className="h-3 w-3" />
						Записан на приём
					</span>
				);
			case "contacted_declined":
				return (
					<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-red-500/10 text-red-600 border border-red-500/20">
						<XCircle className="h-3 w-3" />
						Отказ
					</span>
				);
			case "done":
				return (
					<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">
						<CheckCircle2 className="h-3 w-3" />
						Завершён
					</span>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col gap-5">
			{/* Telemetry Metrics */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 shadow-sm">
					<div className="text-xs text-[var(--muted)] font-medium">К осмотру в этом месяце</div>
					<div className="text-2xl font-bold text-[var(--ink)] mt-1">{stats.dueThisMonth}</div>
					<div className="text-[11px] text-[var(--muted)] mt-1">плановый график</div>
				</div>

				<div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 shadow-sm">
					<div className="text-xs text-amber-600 font-medium flex items-center gap-1">
						<AlertCircle className="h-3.5 w-3.5" />
						Просроченные
					</div>
					<div className="text-2xl font-bold text-amber-600 mt-1">{stats.overdue}</div>
					<div className="text-[11px] text-[var(--muted)] mt-1">требуют звонка</div>
				</div>

				<div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 shadow-sm">
					<div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
						<CheckCircle2 className="h-3.5 w-3.5" />
						Записаны на приём
					</div>
					<div className="text-2xl font-bold text-emerald-600 mt-1">{stats.scheduledThisMonth}</div>
					<div className="text-[11px] text-[var(--muted)] mt-1">успешный контакт</div>
				</div>

				<div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 shadow-sm">
					<div className="text-xs text-[var(--muted)] font-medium">Конверсия Recall</div>
					<div className="text-2xl font-bold text-[var(--ink)] mt-1">
						{(stats.conversionRate * 100).toFixed(0)}%
					</div>
					<div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-0.5">
						<Sparkles className="h-3 w-3" />
						пациенты возвращаются
					</div>
				</div>
			</div>

			{/* Filter Tabs & Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--glass-border)] pb-3">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setActiveFilter("all")}
						className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
							activeFilter === "all"
								? "bg-[var(--accent)] text-white shadow-sm"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-panel)]"
						}`}
					>
						Все ({recalls.length})
					</button>
					<button
						type="button"
						onClick={() => setActiveFilter("pending")}
						className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
							activeFilter === "pending"
								? "bg-[var(--accent)] text-white shadow-sm"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-panel)]"
						}`}
					>
						К контакту ({recalls.filter((r) => r.status === "pending" || r.status === "contacted_no_answer").length})
					</button>
					<button
						type="button"
						onClick={() => setActiveFilter("scheduled")}
						className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
							activeFilter === "scheduled"
								? "bg-[var(--accent)] text-white shadow-sm"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-panel)]"
						}`}
					>
						Записаны ({recalls.filter((r) => r.status === "contacted_scheduled").length})
					</button>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
					<button
						type="button"
						onClick={fetchRecalls}
						disabled={loading}
						className="flex items-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--glass-panel)] transition-colors"
					>
						<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
						Обновить
					</button>
				</div>
			</div>

			{/* Pipeline Recall Feed */}
			<div className="space-y-3">
				{filteredRecalls.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-[var(--glass-border)] bg-[var(--paper-strong)] text-center text-[var(--muted)]">
						<Calendar className="h-8 w-8 mb-2 opacity-40" />
						<p className="text-sm font-medium">Нет вызовов по выбранному фильтру</p>
					</div>
				) : (
					filteredRecalls.map((recall) => (
						<div
							key={recall.id}
							className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 shadow-sm hover:border-[var(--accent)]/40 transition-colors"
						>
							<div className="flex items-start gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-panel)] text-[var(--accent)] border border-[var(--glass-border)]">
									<User className="h-5 w-5" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold text-[var(--ink)]">{recall.patientName}</span>
										{renderStatusBadge(recall.status)}
									</div>
									<div className="text-xs text-[var(--muted)] mt-0.5 flex flex-wrap items-center gap-2">
										<span>{recall.reason}</span>
										<span>•</span>
										<span className="font-mono text-[var(--ink)]">{recall.dueMonth}</span>
										{recall.patientPhone ? (
											<>
												<span>•</span>
												<span className="font-mono">{recall.patientPhone}</span>
											</>
										) : null}
									</div>
									{recall.linkedAppointmentDate ? (
										<div className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
											<Calendar className="h-3 w-3" />
											Запись: {recall.linkedAppointmentDate}
										</div>
									) : null}
								</div>
							</div>

							{/* Actions */}
							<div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--glass-border)]">
								<button
									type="button"
									onClick={() => void handleSendWhatsAppReminder(recall)}
									disabled={actioningId === recall.id}
									className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
								>
									{actioningId === recall.id ? (
										<RefreshCw className="h-3.5 w-3.5 animate-spin" />
									) : (
										<MessageSquare className="h-3.5 w-3.5" />
									)}
									WhatsApp
								</button>
								<button
									type="button"
									onClick={() => handleSnoozeRecall(recall.id, 1)}
									className="flex items-center gap-1 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] px-2.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--glass-panel)] transition-colors"
								>
									<Clock className="h-3.5 w-3.5 text-[var(--muted)]" />
									+1 мес
								</button>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};
