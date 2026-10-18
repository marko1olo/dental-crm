import React, { useState } from "react";
import { CheckCircle2, DoorOpen, ShieldCheck, X } from "lucide-react";
import { showToast } from "../GlobalToast";

export interface CabinetHandoverModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly cabinetName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly nextDoctorName?: string | undefined;
	readonly onConfirmHandover?: ((notes?: string) => void) | undefined;
}

/**
 * CabinetHandoverModal — 1-Click Doctor Cabinet Handover (Mandates 8e & 8n).
 * Replaces the obsolete household chore simulator with instant background logging.
 * Zero manual checkboxes for spittoons, distilled water, or trash bags.
 */
export const CabinetHandoverModal: React.FC<CabinetHandoverModalProps> = ({
	isOpen,
	onClose,
	cabinetName = "Кабинет №1",
	doctorFullName = "Лечащий врач",
	nextDoctorName = "Сменяющий врач",
	onConfirmHandover,
}) => {
	const [handoverNote, setHandoverNote] = useState<string>("");
	const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

	if (!isOpen) return null;

	const handleConfirm = () => {
		setIsSubmitted(true);
		onConfirmHandover?.(handoverNote.trim() || undefined);
		showToast(
			`Кабинет «${cabinetName}» успешно передан смене. Акт передачи и журнал СанПиН сформированы автоматически.`,
			"info",
		);
		setTimeout(() => {
			setIsSubmitted(false);
			onClose();
		}, 300);
	};

	const nextDoctorInitials = nextDoctorName
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase() || "ВР";

	return (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cabinet-handover-modal-title"
			data-testid="cabinet-handover-modal"
		>
			<div
				className="w-full max-w-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
				style={{ background: "var(--paper)", color: "var(--ink)" }}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "16px 20px",
						borderBottom: "1px solid var(--line)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "10px",
								background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
								color: "var(--teal-dark, #0f766e)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<DoorOpen size={20} aria-hidden="true" />
						</div>
						<div style={{ minWidth: 0 }}>
							<h3
								id="cabinet-handover-modal-title"
								style={{
									margin: 0,
									fontSize: "15px",
									fontWeight: 700,
									color: "var(--ink)",
									lineHeight: 1.25,
								}}
							>
								Передача кабинета и смены
							</h3>
							<p
								style={{
									margin: "2px 0 0",
									fontSize: "12px",
									color: "var(--muted)",
									lineHeight: 1.3,
								}}
							>
								{cabinetName} · Сдал: {doctorFullName}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
						style={{
							background: "none",
							border: "none",
							color: "var(--muted)",
							cursor: "pointer",
							padding: "8px",
							borderRadius: "8px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>

				{/* Body */}
				<div
					style={{
						padding: "18px 20px",
						display: "flex",
						flexDirection: "column",
						gap: "14px",
						overflowY: "auto",
					}}
				>
					{/* Next doctor card */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							padding: "12px 14px",
							borderRadius: "12px",
							background: "var(--paper-soft, #f8fafc)",
							border: "1px solid var(--line)",
						}}
					>
						<div
							style={{
								width: "40px",
								height: "40px",
								borderRadius: "10px",
								background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
								color: "var(--teal-dark, #0f766e)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontWeight: 700,
								fontSize: "14px",
								flexShrink: 0,
							}}
						>
							{nextDoctorInitials}
						</div>
						<div style={{ minWidth: 0, flex: 1 }}>
							<span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
								Принимающий смену врач:
							</span>
							<strong
								style={{
									display: "block",
									fontSize: "14px",
									fontWeight: 700,
									color: "var(--ink)",
									lineHeight: 1.25,
								}}
							>
								{nextDoctorName}
							</strong>
							<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
								Дежурный врач (следующая смена)
							</span>
						</div>
						<CheckCircle2 size={20} className="text-teal-600" aria-hidden="true" />
					</div>

					{/* Automated compliance banner */}
					<div
						style={{
							display: "flex",
							alignItems: "flex-start",
							gap: "10px",
							padding: "12px 14px",
							borderRadius: "12px",
							background: "var(--teal-surface, rgba(13, 148, 136, 0.07))",
							border: "1px solid var(--line-subtle, rgba(13, 148, 136, 0.2))",
						}}
					>
						<ShieldCheck size={18} className="text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
						<div style={{ fontSize: "12px", color: "var(--ink)", lineHeight: 1.45 }}>
							<strong>Автоматическое санитарное актирование:</strong> Все электронные карты
							приёмов сохранены. Акт передачи кабинета, списание расходников и журнал СанПиН
							3.3686-21 фиксируются в системе фоном в 1 клик.
						</div>
					</div>

					{/* Note to next doctor (optional) */}
					<div>
						<label
							htmlFor="cabinet-handover-note"
							style={{
								display: "block",
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--ink)",
								marginBottom: "6px",
							}}
						>
							Примечание сменщику (необязательно):
						</label>
						<input
							id="cabinet-handover-note"
							type="text"
							value={handoverNote}
							onChange={(e) => setHandoverNote(e.target.value)}
							placeholder="Например: стерильные боры в правом лотке, автоклав готов..."
							className="dente-input"
							style={{
								width: "100%",
								height: "40px",
								fontSize: "13px",
								padding: "0 12px",
								borderRadius: "10px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
							}}
							data-testid="input-cabinet-handover-note"
						/>
					</div>
				</div>

				{/* Footer */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
						gap: "10px",
						padding: "14px 20px",
						borderTop: "1px solid var(--line)",
						background: "var(--paper-soft, #f8fafc)",
					}}
				>
					<button
						type="button"
						onClick={onClose}
						className="secondary-button"
						style={{
							minHeight: "44px",
							padding: "0 18px",
							fontSize: "13px",
							fontWeight: 600,
							borderRadius: "10px",
							cursor: "pointer",
						}}
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleConfirm}
						className="primary-button"
						style={{
							minHeight: "44px",
							padding: "0 22px",
							fontSize: "13px",
							fontWeight: 700,
							borderRadius: "10px",
							display: "inline-flex",
							alignItems: "center",
							gap: "8px",
							cursor: "pointer",
						}}
						data-testid="btn-confirm-cabinet-handover"
					>
						<CheckCircle2 size={16} aria-hidden="true" />
						<span>{isSubmitted ? "Кабинет передан ✓" : "Сдать кабинет & Передать смену"}</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default CabinetHandoverModal;
