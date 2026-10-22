import React from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import {
	BactericidalAddEquipmentFormFields,
	type BactericidalAddEquipmentFormFieldsProps,
} from "./bactericidal/BactericidalAddEquipmentFormFields";

export interface BactericidalAddEquipmentModalProps extends BactericidalAddEquipmentFormFieldsProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly submitting: boolean;
}

export function BactericidalAddEquipmentModal({
	isOpen,
	onClose,
	onSubmit,
	submitting,
	...fieldProps
}: BactericidalAddEquipmentModalProps) {
	if (!isOpen) return null;

	const modalContent = (
		<div
			className="sanpin-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Регистрация бактерицидного облучателя"
			onClick={onClose}
		>
			<div className="sanpin-modal" onClick={(e) => e.stopPropagation()}>
				<div className="sanpin-modal-header">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<ShieldCheck size={20} color="var(--teal, #0d9488)" />
						<div>
							<h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
								Регистрация бактерицидного облучателя
							</h3>
							<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								Санитарный режим • Паспорт установки и учет наработки часов
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--muted)",
							minHeight: "44px",
							minWidth: "44px",
						}}
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>
				<form onSubmit={onSubmit}>
					<BactericidalAddEquipmentFormFields {...fieldProps} />
					<div className="sanpin-modal-footer">
						<button
							type="button"
							onClick={onClose}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "44px" }}
						>
							Отмена
						</button>
						<button
							type="submit"
							aria-busy={submitting}
							style={{ opacity: submitting ? 0.7 : 1, minHeight: "44px" }}
							className="sanpin-btn sanpin-btn-primary"
						>
							Поставить на учет в журнале
						</button>
					</div>
				</form>
			</div>
		</div>
	);

	const portalRoot = typeof document !== "undefined" ? document.getElementById("portal-root") : null;
	if (portalRoot) {
		return createPortal(modalContent, portalRoot);
	}
	return modalContent;
}

export { BactericidalAddEquipmentFormFields } from "./bactericidal/BactericidalAddEquipmentFormFields";
