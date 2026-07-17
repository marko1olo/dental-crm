import { Link as LinkIcon, Plus, Search, UserPlus, Users } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
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

	useEffect(() => {
		if (isLinking && searchQuery.length >= 2) {
			const delayFn = setTimeout(async () => {
				setSearchLoading(true);
				try {
					const res = await fetch(
						`/api/finance/family?search=${encodeURIComponent(searchQuery)}`,
						{
							headers: denteAdminSecretRequestHeaders(),
						},
					);
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
		<div className="panel" style={{ marginBottom: "20px" }}>
			<h3
				className="panel-heading compact-heading"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "16px",
					border: "none",
					padding: 0,
				}}
			>
				<Users size={16} color="var(--brand-500)" />
				<span style={{ fontSize: "14px", fontWeight: 600 }}>
					{familyData ? familyData.name || "Семья пациента" : "Семейный счет"}
				</span>
			</h3>

			{familyData ? (
				<>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							background: "var(--surface-100)",
							padding: "12px",
							borderRadius: "8px",
							border: "1px solid var(--line)",
							marginBottom: "16px",
						}}
					>
						<span
							style={{
								fontSize: "13px",
								color: "var(--slate-500)",
								fontWeight: 500,
							}}
						>
							Баланс семьи:
						</span>
						<span
							style={{
								fontSize: "16px",
								fontWeight: 700,
								color: "var(--brand-600)",
							}}
						>
							{parseFloat(familyData.balance).toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="patients-flex-col-gap-8">
						<span
							style={{
								fontSize: "12px",
								color: "var(--slate-500)",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							Участники:
						</span>
						{familyData.members?.map((m: any) => (
							<div
								key={m.id}
								style={{
									padding: "10px 12px",
									background: "var(--surface-100)",
									border: "1px solid var(--line)",
									borderRadius: "8px",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<span
									style={{
										color:
											m.id === patientId ? "var(--ink)" : "var(--slate-500)",
										fontWeight: m.id === patientId ? 600 : 500,
										fontSize: "13px",
									}}
								>
									{m.fullName}
								</span>
								{m.id === familyData.headPatientId && (
									<span
										style={{
											fontSize: "11px",
											background: "var(--brand-100)",
											color: "var(--brand-700)",
											padding: "2px 6px",
											borderRadius: "4px",
											fontWeight: 600,
										}}
									>
										Глава
									</span>
								)}
							</div>
						))}
					</div>
				</>
			) : (
				<div style={{ marginTop: "12px" }}>
					<p
						style={{
							fontSize: "13px",
							color: "var(--slate-500)",
							marginBottom: "16px",
							lineHeight: "1.4",
						}}
					>
						Пациент не состоит в семейной группе. Вы можете создать новую семью
						или привязать его к существующей.
					</p>

					{isCreating ? (
						<div
							style={{ display: "flex", flexDirection: "column", gap: "12px" }}
						>
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
						<div
							style={{ display: "flex", flexDirection: "column", gap: "12px" }}
						>
							<div style={{ position: "relative" }}>
								<Search
									size={14}
									style={{
										position: "absolute",
										left: "10px",
										top: "10px",
										color: "var(--muted)",
									}}
								/>
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

							<div
								style={{
									maxHeight: "150px",
									overflowY: "auto",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}
							>
								{searchLoading && (
									<div
										style={{
											fontSize: "12px",
											color: "var(--muted)",
											textAlign: "center",
											padding: "8px",
										}}
									>
										Поиск...
									</div>
								)}
								{!searchLoading &&
									searchQuery.length >= 2 &&
									searchResults.length === 0 && (
										<div
											style={{
												fontSize: "12px",
												color: "var(--muted)",
												textAlign: "center",
												padding: "8px",
											}}
										>
											Семьи не найдены
										</div>
									)}
								{searchResults.map((f) => (
									<div
										key={f.id}
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											padding: "10px",
											background: "var(--surface-100)",
											border: "1px solid var(--line)",
											borderRadius: "8px",
											cursor: "pointer",
											transition: "background 0.2s",
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.background = "var(--surface-200)";
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.background = "var(--surface-100)";
										}}
										onClick={() => handleLinkFamily(f.id)}
									>
										<div>
											<div
												style={{
													fontSize: "13px",
													fontWeight: 600,
													color: "var(--ink)",
												}}
											>
												{f.name}
											</div>
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
									setNewFamilyName(
										`Семья ${patientName ? patientName.split(" ")[0] : ""}`.trim(),
									);
									setIsCreating(true);
								}}
								style={{
									flex: 1,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									padding: "8px",
									fontSize: "13px",
								}}
							>
								<UserPlus size={14} /> Создать семью
							</button>
							<button
								className="secondary-button"
								onClick={() => setIsLinking(true)}
								style={{
									flex: 1,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									padding: "8px",
									fontSize: "13px",
								}}
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
