import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/main.css";
import "./styles/tailwind.css";
import "./styles/components.css";
import "./styles/dente-redesign.css";
import "./components/anesthesia/anesthesia.css";
import "./components/emergency/emergencyRescue.css";
import { AnesthesiaQuickBar } from "./components/anesthesia/AnesthesiaQuickBar";
import { EmergencyRescueModal } from "./components/emergency/EmergencyRescueModal";

function AnesthesiaHarness() {
	const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

	return (
		<div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)", padding: "2rem", boxSizing: "border-box" }}>
			<header style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div>
					<h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>DENTE — Панель анестезии и реанимационный HUD</h1>
					<p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.875rem" }}>
						Приказы МЗ РФ № 786н / 1079н / 1144н / 138н & СтАР / ФАР • Автономия врача (Мандат 8e)
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsEmergencyOpen(true)}
					style={{
						padding: "0.75rem 1.25rem",
						background: "var(--bad-fg)",
						color: "var(--on-teal)",
						border: "none",
						borderRadius: "8px",
						fontWeight: 800,
						cursor: "pointer",
						minHeight: "48px",
					}}
					data-testid="btn-open-emergency-hud"
				>
					ЭКСТРЕННЫЙ РЕАНИМАЦИОННЫЙ HUD (112)
				</button>
			</header>

			<section style={{ marginBottom: "2rem" }}>
				<h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Панель анестезии врача (Нормальный статус)</h2>
				<AnesthesiaQuickBar
					patientWeightKg={70}
					patientAgeYears={35}
					hasCardiovascularRisk={false}
					onOpenEmergencyProtocol={() => setIsEmergencyOpen(true)}
				/>
			</section>

			<section style={{ marginBottom: "2rem" }}>
				<h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Панель анестезии при кардиоваскулярном риске (ССЗ)</h2>
				<AnesthesiaQuickBar
					patientWeightKg={75}
					patientAgeYears={58}
					hasCardiovascularRisk={true}
					hasHypertension={true}
					onOpenEmergencyProtocol={() => setIsEmergencyOpen(true)}
				/>
			</section>

			<EmergencyRescueModal
				isOpen={isEmergencyOpen}
				onClose={() => setIsEmergencyOpen(false)}
				initialPatientName="Иванов Иван Иванович"
				initialPatientAgeYears={35}
				initialPatientWeightKg={70}
				defaultScenarioId="anaphylactic_shock"
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<AnesthesiaHarness />);
}
