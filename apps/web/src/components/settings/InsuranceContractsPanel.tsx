/**
 * InsuranceContractsPanel — manages DMS (voluntary medical insurance) contracts
 * for the organization. Lives in the Settings → ДМС tab.
 */

import { Edit2, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { showToast } from "../GlobalToast";

interface InsuranceContract {
	id: string;
	companyName: string;
	policyNumberMask: string | null;
	coverageTherapyPct: number;
	coverageSurgeryPct: number;
	coverageOrthoPct: number;
	coverageHygienePct: number;
	annualLimitRub: number | null;
	isActive: boolean;
	createdAt: string;
}

interface ContractFormData {
	companyName: string;
	policyNumberMask: string;
	coverageTherapyPct: string;
	coverageSurgeryPct: string;
	coverageOrthoPct: string;
	coverageHygienePct: string;
	annualLimitRub: string;
}

const defaultForm = (): ContractFormData => ({
	companyName: "",
	policyNumberMask: "",
	coverageTherapyPct: "0",
	coverageSurgeryPct: "0",
	coverageOrthoPct: "0",
	coverageHygienePct: "0",
	annualLimitRub: "",
});

const clampPct = (v: string) => Math.min(100, Math.max(0, parseFloat(v) || 0));

export const InsuranceContractsPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const { auth } = mergedProps;
	const {} = derivations;

	const [contracts, setContracts] = useState<InsuranceContract[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingContract, setEditingContract] =
		useState<InsuranceContract | null>(null);
	const [formData, setFormData] = useState<ContractFormData>(defaultForm());

	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

	const fetchContracts = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch("/api/insurance/contracts", {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setContracts(Array.isArray(data) ? data : []);
			} else {
				showToast("Ошибка загрузки договоров ДМС", "error");
			}
		} catch {
			showToast("Системная ошибка", "error");
		} finally {
			setIsLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		fetchContracts();
	}, [fetchContracts]);

	const openAddModal = () => {
		setEditingContract(null);
		setFormData(defaultForm());
		setShowModal(true);
	};

	const openEditModal = (contract: InsuranceContract) => {
		setEditingContract(contract);
		setFormData({
			companyName: contract.companyName,
			policyNumberMask: contract.policyNumberMask ?? "",
			coverageTherapyPct: String(contract.coverageTherapyPct),
			coverageSurgeryPct: String(contract.coverageSurgeryPct),
			coverageOrthoPct: String(contract.coverageOrthoPct),
			coverageHygienePct: String(contract.coverageHygienePct),
			annualLimitRub:
				contract.annualLimitRub != null ? String(contract.annualLimitRub) : "",
		});
		setShowModal(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.companyName.trim()) return;

		const payload = {
			companyName: formData.companyName.trim(),
			policyNumberMask: formData.policyNumberMask.trim() || undefined,
			coverageTherapyPct: clampPct(formData.coverageTherapyPct),
			coverageSurgeryPct: clampPct(formData.coverageSurgeryPct),
			coverageOrthoPct: clampPct(formData.coverageOrthoPct),
			coverageHygienePct: clampPct(formData.coverageHygienePct),
			annualLimitRub: formData.annualLimitRub
				? parseInt(formData.annualLimitRub, 10) || undefined
				: undefined,
		};

		try {
			let res: Response;
			if (editingContract) {
				res = await fetch(`/api/insurance/contracts/${editingContract.id}`, {
					method: "PUT",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(payload),
				});
			} else {
				res = await fetch("/api/insurance/contracts", {
					method: "POST",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(payload),
				});
			}

			if (res.ok) {
				showToast(
					editingContract ? "Договор обновлён" : "Договор добавлен",
					"success",
				);
				setShowModal(false);
				fetchContracts();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast((err as any)?.error ?? "Ошибка сохранения", "error");
			}
		} catch {
			showToast("Системная ошибка", "error");
		}
	};

	const handleDeactivate = async (contract: InsuranceContract) => {
		if (
			!window.confirm(
				`Удалить договор «${contract.companyName}»? Его больше нельзя будет использовать в планах лечения.`,
			)
		)
			return;
		try {
			const res = await fetch(`/api/insurance/contracts/${contract.id}`, {
				method: "DELETE",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				showToast("Договор деактивирован", "success");
				fetchContracts();
			} else {
				showToast("Ошибка удаления", "error");
			}
		} catch {
			showToast("Системная ошибка", "error");
		}
	};

	const coverageCategories: Array<{
		label: string;
		key: keyof ContractFormData;
	}> = [
		{ label: "Терапия", key: "coverageTherapyPct" },
		{ label: "Хирургия", key: "coverageSurgeryPct" },
		{ label: "Ортодонтия", key: "coverageOrthoPct" },
		{ label: "Гигиена", key: "coverageHygienePct" },
	];

	return (
		<div style={{ padding: "8px 0" }}>
			{/* Header */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					marginBottom: 24,
					flexWrap: "wrap",
					gap: 12,
				}}
			>
				<div>
					<h2
						style={{
							margin: 0,
							fontSize: 20,
							fontWeight: 700,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 10,
						}}
					>
						<ShieldCheck size={22} color="var(--teal)" />
						Договоры ДМС
					</h2>
					<p
						style={{ margin: "6px 0 0 0", color: "var(--muted)", fontSize: 14 }}
					>
						Страховые компании и покрытие по категориям услуг. Используются в
						Сравнительном конструкторе смет.
					</p>
				</div>
				<button className="primary-button" onClick={openAddModal}>
					<Plus size={16} /> Добавить договор
				</button>
			</div>

			{/* Contracts list */}
			{isLoading ? (
				<div
					style={{
						padding: 48,
						textAlign: "center",
						color: "var(--muted)",
					}}
				>
					Загрузка договоров...
				</div>
			) : contracts.length === 0 ? (
				<div
					style={{
						border: `2px dashed ${borderColor}`,
						borderRadius: 16,
						padding: 48,
						textAlign: "center",
						color: "var(--muted)",
					}}
				>
					<ShieldCheck
						size={40}
						strokeWidth={1}
						style={{ opacity: 0.3, marginBottom: 12 }}
					/>
					<p style={{ margin: 0, fontSize: 15 }}>Договоров ДМС нет.</p>
					<p style={{ margin: "6px 0 0 0", fontSize: 13 }}>
						Добавьте договор страховой компании, чтобы применять его в
						планировщике смет.
					</p>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					{contracts.map((contract) => (
						<div
							key={contract.id}
							style={{
								background: paperBg,
								border: `1px solid ${borderColor}`,
								borderRadius: 16,
								padding: "20px 24px",
								display: "flex",
								flexDirection: "column",
								gap: 16,
							}}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
									flexWrap: "wrap",
									gap: 12,
								}}
							>
								<div>
									<h3
										style={{
											margin: 0,
											fontSize: 16,
											fontWeight: 600,
											color: "var(--ink)",
										}}
									>
										{contract.companyName}
									</h3>
									{contract.policyNumberMask && (
										<p
											style={{
												margin: "4px 0 0 0",
												fontSize: 12,
												color: "var(--muted)",
											}}
										>
											Маска полиса: {contract.policyNumberMask}
										</p>
									)}
									{contract.annualLimitRub != null && (
										<p
											style={{
												margin: "4px 0 0 0",
												fontSize: 12,
												color: "var(--muted)",
											}}
										>
											Годовой лимит:{" "}
											{contract.annualLimitRub.toLocaleString("ru-RU")} ₽
										</p>
									)}
								</div>
								<div style={{ display: "flex", gap: 8 }}>
									<button
										onClick={() => openEditModal(contract)}
										style={{
											background: "rgba(245,158,11,0.1)",
											color: "#d97706",
											border: "none",
											width: 34,
											height: 34,
											borderRadius: 8,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
										title="Редактировать"
									>
										<Edit2 size={14} />
									</button>
									<button
										onClick={() => handleDeactivate(contract)}
										style={{
											background: "rgba(239,68,68,0.1)",
											color: "var(--tomato)",
											border: "none",
											width: 34,
											height: 34,
											borderRadius: 8,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
										title="Удалить"
									>
										<Trash2 size={14} />
									</button>
								</div>
							</div>

							{/* Coverage grid */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
									gap: 10,
								}}
							>
								{[
									{ label: "Терапия", val: contract.coverageTherapyPct },
									{ label: "Хирургия", val: contract.coverageSurgeryPct },
									{ label: "Ортодонтия", val: contract.coverageOrthoPct },
									{ label: "Гигиена", val: contract.coverageHygienePct },
								].map(({ label, val }) => (
									<div
										key={label}
										style={{
											background: paperSoftBg,
											borderRadius: 10,
											padding: "10px 14px",
										}}
									>
										<div
											style={{
												fontSize: 11,
												color: "var(--muted)",
												marginBottom: 4,
											}}
										>
											{label}
										</div>
										<div
											style={{
												fontSize: 20,
												fontWeight: 700,
												color: val > 0 ? "var(--teal)" : "var(--muted)",
											}}
										>
											{val}%
										</div>
										{/* Visual bar */}
										<div
											style={{
												height: 4,
												borderRadius: 2,
												background: borderColor,
												marginTop: 6,
												overflow: "hidden",
											}}
										>
											<div
												style={{
													width: `${val}%`,
													height: "100%",
													background: val > 0 ? "var(--teal)" : "transparent",
													borderRadius: 2,
													transition: "width 0.3s",
												}}
											/>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Add/Edit Modal */}
			{showModal && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
				>
					<div
						style={{
							background: paperBg,
							width: 520,
							maxWidth: "95vw",
							maxHeight: "90vh",
							overflowY: "auto",
							borderRadius: 20,
							padding: 28,
							border: `1px solid ${borderColor}`,
							boxShadow: "0 32px 64px rgba(0,0,0,0.3)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 24,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{editingContract
									? "Редактировать договор"
									: "Добавить договор ДМС"}
							</h2>
							<button
								onClick={() => setShowModal(false)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form
							onSubmit={handleSave}
							style={{ display: "flex", flexDirection: "column", gap: 18 }}
						>
							{/* Company name */}
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Страховая компания *
								</label>
								<input
									type="text"
									required
									value={formData.companyName}
									onChange={(e) =>
										setFormData({ ...formData, companyName: e.target.value })
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="СОГАЗ, Ингосстрах, АльфаСтрахование..."
								/>
							</div>

							{/* Policy mask */}
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Маска номера полиса (опционально)
								</label>
								<input
									type="text"
									value={formData.policyNumberMask}
									onChange={(e) =>
										setFormData({
											...formData,
											policyNumberMask: e.target.value,
										})
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="ХХХХ-ХХХХ-ХХХХ"
								/>
							</div>

							{/* Coverage fields */}
							<div>
								<p
									style={{
										margin: "0 0 10px 0",
										fontSize: 13,
										fontWeight: 600,
										color: "var(--ink)",
									}}
								>
									Покрытие по категориям (%)
								</p>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: 12,
									}}
								>
									{coverageCategories.map(({ label, key }) => (
										<div
											key={key}
											style={{
												display: "flex",
												flexDirection: "column",
												gap: 5,
											}}
										>
											<label
												style={{
													fontSize: 12,
													color: "var(--muted)",
													fontWeight: 500,
												}}
											>
												{label}
											</label>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
												}}
											>
												<input
													type="number"
													min="0"
													max="100"
													step="1"
													value={formData[key]}
													onChange={(e) =>
														setFormData({ ...formData, [key]: e.target.value })
													}
													style={{
														flex: 1,
														padding: "9px 12px",
														borderRadius: 8,
														border: `1px solid ${borderColor}`,
														background: paperSoftBg,
														color: "var(--ink)",
														outline: "none",
													}}
												/>
												<span style={{ color: "var(--muted)", fontSize: 14 }}>
													%
												</span>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Annual limit */}
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Годовой лимит (₽, опционально)
								</label>
								<input
									type="number"
									min="0"
									value={formData.annualLimitRub}
									onChange={(e) =>
										setFormData({ ...formData, annualLimitRub: e.target.value })
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="120000"
								/>
							</div>

							<button
								type="submit"
								className="primary-button"
								style={{ justifyContent: "center", marginTop: 4 }}
							>
								{editingContract ? "Сохранить изменения" : "Добавить договор"}
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};
