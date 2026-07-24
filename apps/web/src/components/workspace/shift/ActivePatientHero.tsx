import { ClipboardCheck, ImageIcon, Phone, CalendarClock, CreditCard, PlayCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { money } from "../../../AppHelpers";

export function ActivePatientHero() {
	const {
		activePatient,
		activePatientHasCallablePhone,
		activePatientCallablePhone,
		dashboard,
		setError,
	} = useAppLogicContext();

	const patientAppointment = useMemo(() => {
		if (!dashboard?.appointments || !activePatient) return null;
		return dashboard.appointments.find((app: any) => app.patientId === activePatient.id);
	}, [dashboard, activePatient]);

	const patientDebt = useMemo(() => {
		if (!dashboard?.patientInsights || !activePatient) return 0;
		const insight = dashboard.patientInsights.find((i: any) => i.patientId === activePatient.id);
		return insight?.balanceDueRub || 0;
	}, [dashboard, activePatient]);

	const visitActive = !!dashboard?.activeVisit;
	const isCompleted = patientAppointment?.status === "completed";
	const needsPayment = patientDebt > 0;

	return (
		<motion.div
			className="now-card glass-panel"
			whileHover={{ boxShadow: "0 12px 32px rgba(0,0,0,0.08)" }}
		>
			<p className="eyebrow">Сейчас в работе</p>
			{activePatient ? (
				<>
					<div className="patient-hero">
						<div className="avatar">{activePatient.fullName.slice(0, 1)}</div>
						<div>
							<h2>{activePatient.fullName}</h2>
							<p>{activePatient.phone ?? "телефон не указан"}</p>
						</div>
					</div>
					<div
						className="hero-actions"
						style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
					>
						<button
							className="primary-button"
							type="button"
							onClick={() => {
								window.location.hash = "visit";
							}}
						>
							<ClipboardCheck aria-hidden="true" /> Открыть прием
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() => {
								window.location.hash = "imaging";
							}}
						>
							<ImageIcon aria-hidden="true" /> Снимки
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() => {
								window.location.hash = "finance";
							}}
						>
							<CreditCard aria-hidden="true" /> Касса
						</button>
						<button
							className="secondary-button"
							type="button"
							aria-describedby={
								!activePatientHasCallablePhone
									? "shift-call-guidance"
									: undefined
							}
							aria-disabled={!activePatientHasCallablePhone}
							title={
								activePatientHasCallablePhone
									? "Позвонить пациенту"
									: "В карточке пациента нет телефона"
							}
							style={{ opacity: !activePatientHasCallablePhone ? 0.6 : 1 }}
							onClick={() => {
								if (!activePatientHasCallablePhone) {
									setError(
										"В карточке пациента нет телефона. Добавьте номер в разделе «Пациенты», чтобы позвонить.",
									);
									return;
								}
								window.location.href = `tel:${activePatientCallablePhone}`;
							}}
						>
							<Phone aria-hidden="true" /> Позвонить
						</button>
					</div>

					{/* Intelligent Dynamic Status Tracker */}
					<div
						style={{
							display: "flex",
							gap: "12px",
							marginTop: "16px",
							padding: "12px 16px",
							alignItems: "center",
							background: isCompleted && !needsPayment ? "var(--green-soft)" : "rgba(255,255,255,0.05)",
							borderRadius: "12px",
							border: "1px solid rgba(255,255,255,0.1)"
						}}
					>
						<span
							style={{
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--muted)",
							}}
						>
							Статус:
						</span>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								fontSize: "13px",
							}}
						>
							<span style={{ 
								display: "flex", alignItems: "center", gap: "4px",
								color: patientAppointment ? "var(--teal)" : "var(--muted)", 
								fontWeight: patientAppointment ? 600 : 400 
							}}>
								<CalendarClock size={14} /> 1. Запись {patientAppointment?.status === 'arrived' && '(Ожидает)'}
							</span>
							<span style={{ color: "var(--muted)" }}>→</span>
							<span
								style={{
									display: "flex", alignItems: "center", gap: "4px",
									color: visitActive || isCompleted ? "var(--teal)" : "var(--muted)",
									fontWeight: visitActive ? 600 : 400,
								}}
							>
								<PlayCircle size={14} /> 2. ЭМК {visitActive && '(В процессе)'}
							</span>
							<span style={{ color: "var(--muted)" }}>→</span>
							<span style={{ 
								display: "flex", alignItems: "center", gap: "4px",
								color: needsPayment ? "var(--amber)" : isCompleted ? "var(--green)" : "var(--muted)",
								fontWeight: needsPayment ? 600 : 400
							}}>
								<CreditCard size={14} /> 3. Оплата 
								{needsPayment ? `(Долг ${money(patientDebt)})` : (isCompleted ? "(Оплачено)" : "")}
							</span>
						</div>
					</div>

					{!activePatientHasCallablePhone ? (
						<p
							className="hero-call-guidance"
							id="shift-call-guidance"
							role="status"
							aria-live="polite"
							style={{ marginTop: "12px" }}
						>
							В карточке пациента нет телефона. Откройте «Пациенты» и добавьте
							номер, чтобы кнопка звонка стала активной.
						</p>
					) : null}
				</>
			) : (
				<div style={{ padding: "20px 0", color: "#6b7280", fontSize: "15px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
					<CheckCircle2 size={48} color="var(--line-strong)" strokeWidth={1} />
					<span>Нет активного приема. Выберите пациента или запланируйте запись в расписании.</span>
				</div>
			)}
		</motion.div>
	);
}
