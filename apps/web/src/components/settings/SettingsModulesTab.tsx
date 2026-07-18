import { Blocks, RotateCcw, Building2, User, Users } from "lucide-react";
import { WorkspaceFeaturesSelector } from "../workspace/WorkspaceFeaturesSelector";
import { useWorkspaceProfileStore } from "../../hooks/useWorkspaceProfile";

export function SettingsModulesTab() {
	const store = useWorkspaceProfileStore();

	const isSolo = store.clinicMode === "solo_doctor";
	const isSmallClinic = store.clinicMode === "small_clinic";

	const restartOnboarding = () => {
		// Just clear the onboarding completed flag locally to re-trigger the wizard overlay
		useWorkspaceProfileStore.getState().setFlag("onboardingCompleted", false);
	};

	return (
		<section className="settings-zone animate-fade-in" id="settings-modules">
			<header className="zone-header">
				<div className="zone-title-group">
					<div className="zone-icon-box">
						<Blocks aria-hidden="true" />
					</div>
					<div className="zone-title-text">
						<h2>Модули и функции</h2>
						<p>Включайте только те инструменты, которые нужны вашей клинике</p>
					</div>
				</div>
			</header>

			<div style={{ maxWidth: 700, margin: "0 auto", padding: "0 1rem", paddingBottom: 60 }}>
				{/* Clinic Mode Summary Card */}
				<div style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					background: "rgba(255,255,255,0.03)",
					border: "1px solid rgba(255,255,255,0.1)",
					borderRadius: 16,
					padding: "20px 24px",
					marginBottom: 32,
				}}>
					<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
						<div style={{
							width: 48,
							height: 48,
							borderRadius: 12,
							background: "rgba(255,255,255,0.05)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--color-primary-400)"
						}}>
							{isSolo ? <User size={24} /> : isSmallClinic ? <Building2 size={24} /> : <Users size={24} />}
						</div>
						<div>
							<h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
								{isSolo ? "Соло-практика" : isSmallClinic ? "Небольшая клиника / Кабинет" : "Сетевая клиника"}
							</h3>
							<p style={{ fontSize: 13, opacity: 0.6, margin: 0 }}>
								Базовый пресет конфигурации: <strong style={{ textTransform: "capitalize", color: "var(--color-primary-400)" }}>{store.workspacePreset.replace(/_/g, " ")}</strong>
							</p>
						</div>
					</div>
					<button
						onClick={restartOnboarding}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							background: "transparent",
							border: "1px solid rgba(255,255,255,0.2)",
							padding: "8px 16px",
							borderRadius: 8,
							color: "inherit",
							cursor: "pointer",
							fontSize: 13,
							fontWeight: 500,
							transition: "all 0.2s"
						}}
					>
						<RotateCcw size={14} />
						Перезапустить настройку
					</button>
				</div>

				<WorkspaceFeaturesSelector />
			</div>
		</section>
	);
}
