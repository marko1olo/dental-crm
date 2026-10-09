import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, Send, X } from "lucide-react";
import { type EmkDefectTag, EMK_DEFECT_TAGS_CATALOG } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import type { RejectionModalProps } from "./types";

export function EmkVisitHandoffModal({
	visit,
	isOpen,
	onClose,
	onSubmit,
	isSubmitting,
}: RejectionModalProps) {
	const [reason, setReason] = useState("");
	const [selectedTags, setSelectedTags] = useState<EmkDefectTag[]>([]);

	useEffect(() => {
		if (isOpen) {
			setSelectedTags(
				visit.detectedDefects.length > 0
					? [...visit.detectedDefects]
					: ["missing_treatment_protocol"],
			);
			setReason(visit.cmoRemarks || "");
		}
	}, [isOpen, visit]);

	if (!isOpen) return null;

	const toggleTag = (tag: EmkDefectTag) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
		);
	};

	const handleSend = async () => {
		if (!reason.trim()) {
			showToast("Укажите причину отправки на доработку", "warning");
			return;
		}
		await onSubmit(visit.id, reason, selectedTags);
		onClose();
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0,0,0,0.65)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
				padding: "16px",
			}}
		>
			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "14px",
					width: "100%",
					maxWidth: "640px",
					boxShadow: "var(--shadow-3, 0 20px 25px -5px rgba(0,0,0,0.2))",
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{/* Header */}
				<div
					style={{
						padding: "16px 20px",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "8px",
								background: "rgba(239, 68, 68, 0.12)",
								color: "var(--bad, #ef4444)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<AlertTriangle size={20} />
						</div>
						<div>
							<h3
								style={{
									margin: 0,
									fontSize: "16px",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
								}}
							>
								Возврат карты на доработку врачу
							</h3>
							<p
								style={{
									margin: 0,
									fontSize: "12px",
									color: "var(--ink-2, #64748b)",
								}}
							>
								Пациент: {visit.patientFullName} | Врач: {visit.doctorFullName}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "transparent",
							border: "none",
							cursor: "pointer",
							color: "var(--ink-2, #64748b)",
							padding: "6px",
							borderRadius: "6px",
						}}
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<div
					style={{
						padding: "20px",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
						maxHeight: "70vh",
						overflowY: "auto",
					}}
				>
					{/* Defect Tags */}
					<div>
						<label
							style={{
								display: "block",
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink, #0f172a)",
								marginBottom: "8px",
							}}
						>
							Укажите клинические замечания к разделам медицинской карты:
						</label>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
								gap: "6px",
							}}
						>
							{EMK_DEFECT_TAGS_CATALOG.map((meta) => {
								const isSelected = selectedTags.includes(meta.tag);
								return (
									<button
										key={meta.tag}
										type="button"
										onClick={() => toggleTag(meta.tag)}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											padding: "8px 10px",
											borderRadius: "6px",
											fontSize: "12px",
											textAlign: "left",
											cursor: "pointer",
											transition: "all 0.15s ease",
											border: isSelected
												? "1px solid var(--bad, #ef4444)"
												: "1px solid var(--line, #e2e8f0)",
											background: isSelected
												? "rgba(239, 68, 68, 0.08)"
												: "var(--paper, #ffffff)",
											color: isSelected
												? "var(--bad, #ef4444)"
												: "var(--ink, #0f172a)",
											fontWeight: isSelected ? 600 : 400,
										}}
									>
										<div
											style={{
												width: "14px",
												height: "14px",
												borderRadius: "3px",
												border: isSelected
													? "1px solid var(--bad, #ef4444)"
													: "1px solid var(--ink-2, #64748b)",
												background: isSelected
													? "var(--bad, #ef4444)"
													: "transparent",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "#ffffff",
												fontSize: "10px",
												flexShrink: 0,
											}}
										>
											{isSelected && <Check size={10} strokeWidth={3} className="text-white" />}
										</div>
										<span>{meta.labelRu}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Custom Comment Field */}
					<div>
						<label
							htmlFor="cmo-rejection-reason"
							style={{
								display: "block",
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink, #0f172a)",
								marginBottom: "6px",
							}}
						>
							Мотивированное предписание Главного врача: *
						</label>
						<textarea
							id="cmo-rejection-reason"
							rows={4}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Опишите, какие разделы истории болезни необходимо исправить или дополнить..."
							style={{
								width: "100%",
								padding: "10px 12px",
								fontSize: "13px",
								borderRadius: "8px",
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper-strong, #f8fafc)",
								color: "var(--ink, #0f172a)",
								outline: "none",
								boxSizing: "border-box",
							}}
						/>
					</div>
				</div>

				{/* Footer */}
				<div
					style={{
						padding: "14px 20px",
						borderTop: "1px solid var(--line, #e2e8f0)",
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
						gap: "10px",
						background: "var(--paper-strong, #f8fafc)",
					}}
				>
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						style={{
							padding: "8px 16px",
							fontSize: "13px",
							fontWeight: 500,
							borderRadius: "6px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #ffffff)",
							color: "var(--ink, #0f172a)",
							cursor: "pointer",
						}}
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleSend}
						disabled={isSubmitting}
						style={{
							padding: "8px 16px",
							fontSize: "13px",
							fontWeight: 600,
							borderRadius: "6px",
							border: "none",
							background: "var(--bad, #ef4444)",
							color: "var(--paper-strong, #ffffff)",
							cursor: isSubmitting ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							opacity: isSubmitting ? 0.6 : 1,
						}}
					>
						<Send size={14} />
						{isSubmitting ? "Отправка..." : "Отправить на доработку"}
					</button>
				</div>
			</div>
		</div>
	);
}

export const RejectionModal = EmkVisitHandoffModal;
