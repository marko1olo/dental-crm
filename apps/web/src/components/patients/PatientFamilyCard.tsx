import React, { useState } from "react";
import { Users, Plus, Link as LinkIcon, UserPlus } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export type PatientFamilyCardProps = {
	patientId: string | null;
	patientName: string | null;
	familyData: any | null;
	onFamilyDataChanged: () => void;
};

export const PatientFamilyCard: React.FC<PatientFamilyCardProps> = ({
	patientId,
	patientName,
	familyData,
	onFamilyDataChanged,
}) => {
	const [isCreating, setIsCreating] = useState(false);
	const [newFamilyName, setNewFamilyName] = useState("");
	const [loading, setLoading] = useState(false);

	if (!patientId) return null;

	const handleCreateFamily = async () => {
		if (!newFamilyName.trim()) {
			showToast("Введите название семьи", "error");
			return;
		}
		setLoading(true);
		try {
			const res = await fetch("/api/finance/family", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					name: newFamilyName.trim(),
					headPatientId: patientId,
				}),
			});
			if (!res.ok) throw new Error("Ошибка при создании семьи");
			
			const family = await res.json();
			
			// After creating the family, we must link the patient to this family group
			// since the API currently only sets headPatientId but not familyGroupId
			const linkRes = await fetch(`/api/patients/${patientId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					familyGroupId: family.id,
				}),
			});
			if (!linkRes.ok) throw new Error("Семья создана, но пациент не привязан");

			showToast("Семья успешно создана", "success");
			setNewFamilyName("");
			setIsCreating(false);
			onFamilyDataChanged();
		} catch (e: any) {
			showToast(e.message || "Ошибка", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="panel family-wallet-panel"
			style={{
				background: "rgba(24, 24, 27, 0.6)",
				backdropFilter: "blur(12px)",
				borderRadius: "12px",
				border: "1px solid rgba(63, 63, 70, 0.4)",
				padding: "16px",
				marginBottom: "20px",
			}}
		>
			<h3 className="patients-glass-header" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<Users size={16} />
				{familyData ? (familyData.name || "Семья пациента") : "Семейный счет"}
			</h3>

			{familyData ? (
				<>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							background: "rgba(9, 9, 11, 0.4)",
							padding: "12px",
							borderRadius: "8px",
							border: "1px solid rgba(63, 63, 70, 0.2)",
							marginBottom: "12px",
						}}
					>
						<span className="patients-glass-muted">Баланс семьи:</span>
						<span className="patients-glass-value" style={{ fontWeight: 600 }}>
							{parseFloat(familyData.balance).toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="patients-flex-col-gap-8">
						<span className="patients-glass-label" style={{ fontSize: "12px", opacity: 0.8 }}>Участники:</span>
						{familyData.members?.map((m: any) => (
							<div key={m.id} className="patients-glass-row" style={{ padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
								<span
									style={{
										color: m.id === patientId ? "var(--text)" : "var(--muted)",
										fontWeight: m.id === patientId ? 500 : 400,
										fontSize: "13px",
									}}
								>
									{m.fullName}
								</span>
								{m.id === familyData.headPatientId && (
									<span style={{ fontSize: "11px", background: "rgba(59, 130, 246, 0.2)", color: "#60A5FA", padding: "2px 6px", borderRadius: "4px" }}>
										Глава
									</span>
								)}
							</div>
						))}
					</div>
				</>
			) : (
				<div style={{ marginTop: "12px" }}>
					<p className="patients-glass-muted" style={{ fontSize: "13px", marginBottom: "16px" }}>
						Пациент не состоит в семейной группе. Вы можете создать новую семью или привязать его к существующей.
					</p>

					{isCreating ? (
						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							<input
								type="text"
								className="text-input"
								placeholder="Название семьи (напр. Семья Ивановых)"
								value={newFamilyName}
								onChange={(e) => setNewFamilyName(e.target.value)}
								autoFocus
							/>
							<div style={{ display: "flex", gap: "8px" }}>
								<button 
									className="primary-button" 
									onClick={handleCreateFamily} 
									disabled={loading}
									style={{ flex: 1, padding: "8px", fontSize: "13px" }}
								>
									{loading ? "Создание..." : "Создать"}
								</button>
								<button 
									className="secondary-button" 
									onClick={() => setIsCreating(false)}
									disabled={loading}
									style={{ flex: 1, padding: "8px", fontSize: "13px" }}
								>
									Отмена
								</button>
							</div>
						</div>
					) : (
						<div style={{ display: "flex", gap: "8px" }}>
							<button 
								className="primary-button" 
								onClick={() => {
									setNewFamilyName(`Семья ${patientName ? patientName.split(' ')[0] : ''}`.trim());
									setIsCreating(true);
								}}
								style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", fontSize: "13px" }}
							>
								<UserPlus size={14} /> Создать семью
							</button>
							<button 
								className="secondary-button" 
								onClick={() => showToast("Привязка к существующей семье пока в разработке", "info")}
								style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", fontSize: "13px" }}
							>
								<LinkIcon size={14} /> Привязать
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
