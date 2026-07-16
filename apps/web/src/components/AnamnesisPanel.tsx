import { Save } from "lucide-react";
import React, { useEffect, useState } from "react";

export function AnamnesisPanel({ patientId }: { patientId: string }) {
	const [allergies, setAllergies] = useState<string>("");
	const [systemicDiseases, setSystemicDiseases] = useState<string>("");
	const [hasCriticalAlerts, setHasCriticalAlerts] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState("");

	useEffect(() => {
		async function fetchAnamnesis() {
			try {
				const res = await fetch(`/api/patients/${patientId}/anamnesis`, {
					headers: {
						"x-dente-staff-token": localStorage.getItem("dente_staff_token") || "",
						"x-dente-clinic-token": localStorage.getItem("dente_clinic_token") || "",
					},
				});
				if (res.ok) {
					const data = await res.json();
					setAllergies((data.allergies || []).join(", "));
					setSystemicDiseases((data.systemicDiseases || []).join(", "));
					setHasCriticalAlerts(data.hasCriticalAlerts || false);
				}
			} catch (e) {
				console.error("Failed to load anamnesis", e);
			} finally {
				setIsLoading(false);
			}
		}
		void fetchAnamnesis();
	}, [patientId]);

	async function saveAnamnesis() {
		setIsSaving(true);
		setFeedback("");
		try {
			const res = await fetch(`/api/patients/${patientId}/anamnesis`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": localStorage.getItem("dente_staff_token") || "",
					"x-dente-clinic-token": localStorage.getItem("dente_clinic_token") || "",
				},
				body: JSON.stringify({
					allergies: allergies.split(",").map(s => s.trim()).filter(Boolean),
					systemicDiseases: systemicDiseases.split(",").map(s => s.trim()).filter(Boolean),
					hasCriticalAlerts,
				}),
			});
			if (res.ok) {
				setFeedback("Анамнез успешно сохранен");
				setTimeout(() => setFeedback(""), 3000);
			} else {
				setFeedback("Ошибка сохранения");
			}
		} catch (e) {
			console.error("Failed to save anamnesis", e);
			setFeedback("Ошибка сохранения");
		} finally {
			setIsSaving(false);
		}
	}

	if (isLoading) return <div className="p-4">Загрузка анамнеза...</div>;

	return (
		<section className="dashboard-card animate-fade-in" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
			<h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Медицинская карта / Анамнез</h3>
			
			<div className="input-group">
				<label>Аллергические реакции (через запятую)</label>
				<input
					className="text-input w-full"
					value={allergies}
					onChange={(e) => setAllergies(e.target.value)}
					placeholder="Например: Лидокаин, Пенициллин"
				/>
			</div>

			<div className="input-group">
				<label>Системные / хронические заболевания (через запятую)</label>
				<input
					className="text-input w-full"
					value={systemicDiseases}
					onChange={(e) => setSystemicDiseases(e.target.value)}
					placeholder="Например: Сахарный диабет, Гипертония"
				/>
			</div>

			<label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: hasCriticalAlerts ? "#ef4444" : "inherit" }}>
				<input
					type="checkbox"
					checked={hasCriticalAlerts}
					onChange={(e) => setHasCriticalAlerts(e.target.checked)}
				/>
				<span>Критическое предупреждение по здоровью (внимание врача)</span>
			</label>

			<div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
				<button
					className="primary-button"
					onClick={saveAnamnesis}
					disabled={isSaving}
				>
					<Save size={18} /> {isSaving ? "Сохранение..." : "Сохранить анамнез"}
				</button>
				{feedback && <span style={{ color: feedback.includes("успешно") ? "#10b981" : "#ef4444", fontWeight: 500 }}>{feedback}</span>}
			</div>
		</section>
	);
}
