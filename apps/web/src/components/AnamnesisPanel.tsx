import { Save } from "lucide-react";
import { useEffect } from "react";
import { usePatientStore } from "../store/patientStore";

export function AnamnesisPanel({ patientId }: { patientId: string }) {
	const {
		anamnesisDraft,
		setAnamnesisDraft,
		anamnesisSaveState,
		loadAnamnesis,
		saveAnamnesis,
	} = usePatientStore();

	useEffect(() => {
		void loadAnamnesis(patientId);
	}, [patientId, loadAnamnesis]);

	const { allergies, systemicDiseases, hasCriticalAlerts } = anamnesisDraft;
	const isSaving = anamnesisSaveState === "saving";

	return (
		<section
			className="dashboard-card animate-fade-in"
			style={{
				padding: "20px",
				display: "flex",
				flexDirection: "column",
				gap: "16px",
			}}
		>
			<h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>
				Медицинская карта / Анамнез
			</h3>

			<div className="input-group">
				<label>Аллергические реакции (через запятую)</label>
				<input
					className="text-input w-full"
					value={allergies.join(", ")}
					onChange={(e) =>
						setAnamnesisDraft((prev) => ({
							...prev,
							allergies: e.target.value
								.split(",")
								.map((s) => s.trim())
								.filter(Boolean),
						}))
					}
					placeholder="Например: Лидокаин, Пенициллин"
				/>
			</div>

			<div className="input-group">
				<label>Системные / хронические заболевания (через запятую)</label>
				<input
					className="text-input w-full"
					value={systemicDiseases.join(", ")}
					onChange={(e) =>
						setAnamnesisDraft((prev) => ({
							...prev,
							systemicDiseases: e.target.value
								.split(",")
								.map((s) => s.trim())
								.filter(Boolean),
						}))
					}
					placeholder="Например: Сахарный диабет, Гипертония"
				/>
			</div>

			<label
				className="checkbox-label"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					fontWeight: 600,
					color: hasCriticalAlerts ? "#ef4444" : "inherit",
				}}
			>
				<input
					type="checkbox"
					checked={hasCriticalAlerts}
					onChange={(e) =>
						setAnamnesisDraft((prev) => ({
							...prev,
							hasCriticalAlerts: e.target.checked,
						}))
					}
				/>
				<span>Критическое предупреждение по здоровью (внимание врача)</span>
			</label>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "12px",
					marginTop: "8px",
				}}
			>
				<button
					className="primary-button"
					onClick={() => saveAnamnesis(patientId)}
					disabled={isSaving}
				>
					<Save size={18} /> {isSaving ? "Сохранение..." : "Сохранить анамнез"}
				</button>
				{anamnesisSaveState === "saved" && (
					<span style={{ color: "#10b981", fontWeight: 500 }}>
						Анамнез успешно сохранен
					</span>
				)}
				{anamnesisSaveState === "error" && (
					<span style={{ color: "#ef4444", fontWeight: 500 }}>
						Ошибка сохранения
					</span>
				)}
			</div>
		</section>
	);
}
