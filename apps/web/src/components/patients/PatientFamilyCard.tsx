import React, { useState, useEffect } from "react";
import { Users, Plus, Link as LinkIcon, UserPlus, Search } from "lucide-react";
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
	const [isLinking, setIsLinking] = useState(false);
	
	const [newFamilyName, setNewFamilyName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<any[]>([]);
	
	const [loading, setLoading] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);

	if (!patientId) return null;

	useEffect(() => {
		if (isLinking && searchQuery.length >= 2) {
			const delayFn = setTimeout(async () => {
				setSearchLoading(true);
				try {
					const res = await fetch(`/api/finance/family?search=${encodeURIComponent(searchQuery)}`, {
						headers: denteAdminSecretRequestHeaders(),
					});
					if (res.ok) {
						const data = await res.json();
						setSearchResults(data);
					}
				} catch (e) {
					console.error("Family search failed", e);
				} finally {
					setSearchLoading(false);
				}
			}, 300);
			return () => clearTimeout(delayFn);
		} else if (isLinking && searchQuery.length < 2) {
			setSearchResults([]);
		}
	}, [searchQuery, isLinking]);

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

	const handleLinkFamily = async (familyId: string) => {
		setLoading(true);
		try {
			const linkRes = await fetch(`/api/patients/${patientId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					familyGroupId: familyId,
				}),
			});
			if (!linkRes.ok) throw new Error("Ошибка при привязке пациента к семье");

			showToast("Успешно привязан к семье", "success");
			setIsLinking(false);
			setSearchQuery("");
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
					) : isLinking ? (
						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							<div style={{ position: "relative" }}>
								<Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--muted)" }} />
								<input
									type="text"
									className="text-input"
									placeholder="Поиск семьи по названию, ФИО или телефону..."
									style={{ paddingLeft: "32px", width: "100%" }}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									autoFocus
								/>
							</div>
							
							<div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
								{searchLoading && <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "8px" }}>Поиск...</div>}
								{!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
									<div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "8px" }}>Семьи не найдены</div>
								)}
								{searchResults.map(f => (
									<div 
										key={f.id} 
										style={{ 
											display: "flex", 
											justifyContent: "space-between", 
											alignItems: "center",
											padding: "8px",
											background: "rgba(255,255,255,0.03)",
											borderRadius: "6px",
											cursor: "pointer",
											transition: "background 0.2s"
										}}
										onClick={() => handleLinkFamily(f.id)}
									>
										<div>
											<div style={{ fontSize: "13px", fontWeight: 500 }}>{f.name}</div>
										</div>
										<button 
											className="secondary-button"
											style={{ padding: "4px 8px", fontSize: "12px" }}
											disabled={loading}
										>
											Выбрать
										</button>
									</div>
								))}
							</div>

							<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
								<button 
									className="secondary-button" 
									onClick={() => {
										setIsLinking(false);
										setSearchQuery("");
										setSearchResults([]);
									}}
									disabled={loading}
									style={{ width: "100%", padding: "8px", fontSize: "13px" }}
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
								onClick={() => setIsLinking(true)}
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
