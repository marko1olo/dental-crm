import React from "react";
import type { Dashboard, Appointment, Patient } from "@dental/shared";
import { Sun, AlertCircle, PhoneCall, CheckCircle2, FlaskConical } from "lucide-react";

interface MorningSummaryWidgetProps {
	dashboard: Dashboard;
	dateFilter: string; // The currently selected date in schedule DateFilter (YYYY-MM-DD)
}

export const MorningSummaryWidget: React.FC<MorningSummaryWidgetProps> = ({ dashboard, dateFilter }) => {
	// Only show morning summary for 'today'
	const todayStr = new Date().toLocaleDateString("en-CA");
	if (dateFilter !== "all" && dateFilter !== todayStr) return null;

	const todayAppointments = (dashboard.appointments || []).filter(a => {
		if (a.status === "cancelled" || a.status === "no_show") return false;
		return a.startsAt.startsWith(todayStr);
	}).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

	if (todayAppointments.length === 0) return null;

	const firstAppointment = todayAppointments[0];
	const firstTime = firstAppointment ? new Date(firstAppointment.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";

	// Find if any of today's patients have debt
	const patientsWithDebt = todayAppointments.filter(a => {
		const patient = dashboard.patients.find(p => p.id === a.patientId);
		// Patient might not have tags directly in type, so we bypass typecheck if we need fake data
		return patient && ((patient as any).tags || []).includes("debt");
	});

	// Find gaps between appointments > 60 mins
	let hasBigGaps = false;
	for (let i = 0; i < todayAppointments.length - 1; i++) {
		const currentAppt = todayAppointments[i];
		const nextAppt = todayAppointments[i+1];
		if (!currentAppt || !nextAppt) continue;
		const currentEnd = new Date(currentAppt.endsAt).getTime();
		const nextStart = new Date(nextAppt.startsAt).getTime();
		if (nextStart - currentEnd >= 60 * 60 * 1000) {
			hasBigGaps = true;
			break;
		}
	}

	// Real obzvon tasks check
	const obzvonCount = (dashboard.communicationTasks || [])
		.filter((t) => (t.status === "needs_call" || t.status === "scheduled") && t.dueAt?.startsWith(todayStr))
		.length;

	// Lab orders are not currently provided in Dashboard schema, removing phantom data mock
	// TODO: When backend adds `labOrders` to Dashboard, wire it here.
	const pendingLabs = 0;

	return (
		<div style={{
			display: "flex",
			gap: "16px",
			padding: "16px",
			marginBottom: "20px",
			background: "linear-gradient(to right, var(--paper), var(--paper-soft))",
			border: "1px solid var(--line)",
			borderRadius: "12px",
			alignItems: "center",
			flexWrap: "wrap"
		}}>
			<div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "200px" }}>
				<div style={{ background: "var(--brand-100)", padding: "10px", borderRadius: "50%", color: "var(--brand-600)" }}>
					<Sun size={24} />
				</div>
				<div>
					<div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Сводка дня</div>
					<div style={{ fontSize: "16px", fontWeight: 600 }}>{todayAppointments.length} пациентов</div>
				</div>
			</div>

			<div style={{ flex: 1, display: "flex", gap: "24px", minWidth: "300px", flexWrap: "wrap" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<CheckCircle2 size={16} color="var(--teal)" />
					<span style={{ fontSize: "14px" }}>Первый в <b>{firstTime}</b></span>
				</div>
				{hasBigGaps && (
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<AlertCircle size={16} color="var(--amber)" />
						<span style={{ fontSize: "14px" }}>Есть <b>окна &gt; 1 часа</b></span>
					</div>
				)}
				{patientsWithDebt.length > 0 && (
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<AlertCircle size={16} color="var(--rose)" />
						<span style={{ fontSize: "14px" }}><b>{patientsWithDebt.length}</b> с долгом (напомнить)</span>
					</div>
				)}
				{obzvonCount > 0 && (
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<PhoneCall size={16} color="var(--brand-500)" />
						<span style={{ fontSize: "14px" }}><b>{obzvonCount}</b> звонков сегодня</span>
					</div>
				)}
				{pendingLabs > 0 && (
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<FlaskConical size={16} color="var(--indigo)" />
						<span style={{ fontSize: "14px" }}><b>{pendingLabs}</b> лаб. работ готово</span>
					</div>
				)}
			</div>
		</div>
	);
};
