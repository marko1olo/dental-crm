import { motion } from "framer-motion";
import { CheckCircle2, DollarSign, UserX, AlertCircle, PhoneCall } from "lucide-react";
import { useMemo } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { showToast } from "../../GlobalToast";

export function ShiftEndSummary() {
	const { dashboard } = useAppLogicContext();

	const stats = useMemo(() => {
		if (!dashboard) return null;

		const todayStr = dashboard.todayIso.split("T")[0];

		// 1. Earned Today
		const todayPayments = dashboard.payments?.filter(
			(p: any) => p.createdAt?.startsWith(todayStr) && p.status === "completed"
		) || [];
		const totalEarned = todayPayments.reduce((sum: number, p: any) => sum + (p.amountRub || 0), 0);

		// 2. Patients Seen & No Shows
		const todayAppointments = dashboard.appointments?.filter(
			(a: any) => a.startsAt.startsWith(todayStr)
		) || [];
		
		const completedApps = todayAppointments.filter((a: any) => a.status === "completed");
		const patientsSeenCount = new Set(completedApps.map((a: any) => a.patientId)).size;
		
		const noShowApps = todayAppointments.filter((a: any) => a.status === "no_show");
		const noShowCount = noShowApps.length;

		// 3. Unpaid completed visits
		const unpaidCount = dashboard.billingSummary?.unpaidDocuments?.length || 0;

		// 4. Calls to make (no_show followups)
		const callsToMake = (dashboard.communicationTasks || []).filter(
			(t: any) => (t.status === "needs_call" || t.status === "scheduled") && t.dueAt?.startsWith(todayStr)
		);

		return {
			totalEarned,
			patientsSeenCount,
			noShowCount,
			unpaidCount,
			callsToMake
		};
	}, [dashboard]);

	if (!stats) return null;

	const handleEndShift = () => {
		if (stats.unpaidCount > 0) {
			showToast("Внимание: остались неоплаченные счета!", "error");
		} else if (stats.callsToMake.length > 0) {
			showToast("Остались необзвоненные пациенты (неявки).", "error");
		} else {
			showToast("Смена успешно завершена. Хорошего вечера!", "success");
		}
	};

	return (
		<motion.section
			className="shift-end-summary glass-panel"
			aria-label="Итоги смены"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
			style={{ display: "flex", flexDirection: "column", gap: "16px", background: "var(--paper-strong)" }}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
					<CheckCircle2 size={18} color="var(--green)" /> Итоги дня
				</h3>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
				<div style={{ padding: "12px", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--border)" }}>
					<p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 4px 0" }}>Выручка за смену</p>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<DollarSign size={16} color="var(--teal)" />
						<strong style={{ fontSize: "18px" }}>{stats.totalEarned.toLocaleString("ru-RU")} ₽</strong>
					</div>
				</div>

				<div style={{ padding: "12px", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--border)" }}>
					<p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 4px 0" }}>Принято пациентов</p>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<CheckCircle2 size={16} color="var(--green)" />
						<strong style={{ fontSize: "18px" }}>{stats.patientsSeenCount}</strong>
					</div>
				</div>

				<div style={{ padding: "12px", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--border)" }}>
					<p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 4px 0" }}>Неявки (No-show)</p>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<UserX size={16} color={stats.noShowCount > 0 ? "var(--red)" : "var(--muted)"} />
						<strong style={{ fontSize: "18px", color: stats.noShowCount > 0 ? "var(--red)" : "inherit" }}>
							{stats.noShowCount}
						</strong>
					</div>
				</div>

				<div style={{ padding: "12px", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--border)" }}>
					<p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 4px 0" }}>Долги (счета)</p>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<AlertCircle size={16} color={stats.unpaidCount > 0 ? "var(--amber)" : "var(--muted)"} />
						<strong style={{ fontSize: "18px", color: stats.unpaidCount > 0 ? "var(--amber)" : "inherit" }}>
							{stats.unpaidCount}
						</strong>
					</div>
				</div>
			</div>

			{stats.callsToMake.length > 0 && (
				<div style={{ padding: "12px", background: "var(--amber-soft)", borderRadius: "8px", border: "1px solid var(--amber)", color: "var(--amber-text, #b45309)" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontWeight: 600 }}>
						<PhoneCall size={16} /> Кому перезвонить по неявкам ({stats.callsToMake.length})
					</div>
					<ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px" }}>
						{stats.callsToMake.map((t: any) => {
							const patient = dashboard.patients?.find((p: any) => p.id === t.patientId);
							return (
								<li key={t.id} style={{ marginBottom: "4px" }}>
									{patient ? patient.fullName : "Неизвестный пациент"} — {t.title}
								</li>
							);
						})}
					</ul>
				</div>
			)}

			<div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
				<button className="primary-button" onClick={handleEndShift}>
					Завершить смену
				</button>
			</div>
		</motion.section>
	);
}
