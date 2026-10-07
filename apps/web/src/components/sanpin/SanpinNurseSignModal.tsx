import { Award, FileBadge, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { showToast } from "../GlobalToast";
import { generateDigitalStampHash } from "./sterilizationSanpinEngine";

export interface SanpinNurseSignModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (signerName?: string, signatureHash?: string) => void;
}

const STORAGE_LAST_NURSE_KEY = "dente_last_nurse_signer";

export function SanpinNurseSignModal({ isOpen, onClose, onSuccess }: SanpinNurseSignModalProps) {
	const [nurseSignName, setNurseSignName] = useState(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem(STORAGE_LAST_NURSE_KEY) || "Медсестра ЦСО";
		}
		return "Медсестра ЦСО";
	});
	const [nurseSignPin, setNurseSignPin] = useState("");
	const [signingShift, setSigningShift] = useState(false);

	useEffect(() => {
		if (isOpen && typeof window !== "undefined") {
			const saved = localStorage.getItem(STORAGE_LAST_NURSE_KEY);
			if (saved) setNurseSignName(saved);
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const handleBatchNurseSign = async (e?: React.FormEvent, bypassNurse = false) => {
		if (e) e.preventDefault();
		try {
			setSigningShift(true);
			const signerName = bypassNurse ? "Персонал клиники" : (nurseSignName.trim() || "Персонал клиники");
			if (!bypassNurse && signerName && typeof window !== "undefined") {
				localStorage.setItem(STORAGE_LAST_NURSE_KEY, signerName);
			}

			const todayStr = new Date().toISOString().slice(0, 10);
			const signatureHash = generateDigitalStampHash({
				date: todayStr,
				cycleNumber: 1,
				operatorFullName: signerName,
			});

			showToast(
				`Смена успешно заверена цифровым штампом (${signerName}). Журналы стерилизации в норме.`,
				"success",
			);
			onClose();
			onSuccess(signerName, signatureHash);
		} catch (err) {
			showToast("Ошибка при заверке смены", "error");
		} finally {
			setSigningShift(false);
		}
	};

	return (
		<div className="sanpin-modal-overlay" role="dialog" aria-modal="true">
			<div className="sanpin-modal" style={{ maxWidth: "560px" }}>
				<div className="sanpin-modal-header" style={{ padding: "1.25rem" }}>
					<h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem" }}>
						<Award size={22} color="var(--brand-primary, #2563eb)" />
						Цифровая заверка смены (ЭЦП / Ответственный сотрудник)
					</h3>
					<button
						type="button"
						onClick={onClose}
						style={{
							minWidth: "34px",
							minHeight: "34px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--muted)",
						}}
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleBatchNurseSign}>
					<div className="sanpin-modal-body" style={{ padding: "1.25rem", gap: "1rem" }}>
						<div
							style={{
								padding: "0.9rem",
								borderRadius: "0.5rem",
								background: "rgba(16, 185, 129, 0.08)",
								border: "1px solid rgba(16, 185, 129, 0.25)",
								fontSize: "0.85rem",
								lineHeight: 1.4,
							}}
							title="Соответствует нормам стерильности"
						>
							<span style={{ fontWeight: 700, color: "#059669" }}>Контроль смены:</span> Настоящим подтверждается проверка целостности упаковок, срабатывания химических индикаторов класса 5 во всех точках закладки, отрицательные азопирамовые пробы и наработка ламп за текущую смену.
						</div>

						<div className="sanpin-form-group">
							<label className="sanpin-form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
								ФИО ответственного сотрудника (врач / администратор / медсестра, опционально)
							</label>
							<input
								type="text"
								value={nurseSignName}
								onChange={(e) => setNurseSignName(e.target.value)}
								className="sanpin-input"
								placeholder="Персонал клиники"
								style={{ minHeight: "36px", height: "36px", fontSize: "0.875rem" }}
							/>
						</div>

						<div className="sanpin-form-group">
							<label className="sanpin-form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
								PIN-код подтверждения ЭЦП (опционально)
							</label>
							<input
								type="password"
								maxLength={6}
								value={nurseSignPin}
								onChange={(e) => setNurseSignPin(e.target.value)}
								className="sanpin-input"
								style={{ minHeight: "36px", height: "36px", fontSize: "1rem", letterSpacing: "4px" }}
								placeholder="••••"
							/>
						</div>
					</div>

					<div className="sanpin-modal-footer" style={{ padding: "1rem 1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
						<button
							type="button"
							onClick={onClose}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "34px", padding: "0.35rem 1rem" }}
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={() => handleBatchNurseSign(undefined, true)}
							aria-busy={signingShift}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "34px", padding: "0.35rem 0.85rem", fontSize: "0.85rem", fontWeight: 700 }}
							title="Пропустить медсестру: подтвердить смену персоналом клиники"
						>
							Пропустить медсестру (Персонал клиники)
						</button>
						<button
							type="submit"
							aria-busy={signingShift}
							className="sanpin-btn sanpin-btn-primary"
							style={{ minHeight: "34px", padding: "0.35rem 1.25rem", fontSize: "0.875rem", fontWeight: 700 }}
						>
							<FileBadge size={16} />
							{signingShift ? "Заверка..." : "Поставить штамп ЭЦП"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
