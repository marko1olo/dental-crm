import { ClipboardCheck, ImageIcon, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

export function ActivePatientHero() {
	const {
		activePatient,
		activePatientHasCallablePhone,
		activePatientCallablePhone,
		dashboard,
		setError,
	} = useAppLogicContext();

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

					{/* Compact Status Tracker */}
					<div
						style={{
							display: "flex",
							gap: "12px",
							marginTop: "16px",
							padding: "8px 12px",
							alignItems: "center",
						}}
						className="glass-panel"
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
								gap: "4px",
								fontSize: "12px",
							}}
						>
							<span style={{ color: "var(--teal)", fontWeight: 600 }}>
								1. Запись
							</span>
							<span style={{ color: "var(--muted)" }}>→</span>
							<span
								style={{
									color: dashboard?.activeVisit
										? "var(--teal)"
										: "var(--muted)",
									fontWeight: dashboard?.activeVisit ? 600 : 400,
								}}
							>
								2. ЭМК
							</span>
							<span style={{ color: "var(--muted)" }}>→</span>
							<span style={{ color: "var(--muted)" }}>3. Оплата</span>
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
				<div style={{ padding: "20px 0", color: "#6b7280", fontSize: "15px" }}>
					Нет активного приема. Выберите пациента или запланируйте запись в
					расписании.
				</div>
			)}
		</motion.div>
	);
}
