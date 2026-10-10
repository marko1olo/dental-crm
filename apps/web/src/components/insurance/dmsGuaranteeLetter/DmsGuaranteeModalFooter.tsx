/**
 * DmsGuaranteeModalFooter.tsx — Нижняя панель действий модального окна гарантийного письма ДМС:
 * «Сохранить гарантийное письмо», «Привязать к текущему визиту»,
 * «Отправить запрос на согласование» и «Отмена».
 */

import { FileCheck, Link2, Send, Zap } from "lucide-react";
import React from "react";

export interface DmsGuaranteeModalFooterProps {
	readonly isEmergencyCare: boolean;
	readonly onClose: () => void;
	readonly onSave: () => void;
	readonly onAttachToCurrentVisit: () => void;
	readonly onSendPreAuthRequest: () => void;
}

export function DmsGuaranteeModalFooter({
	isEmergencyCare,
	onClose,
	onSave,
	onAttachToCurrentVisit,
	onSendPreAuthRequest,
}: DmsGuaranteeModalFooterProps) {
	return (
		<div
			className="dms-modal-footer"
			data-testid="dms-guarantee-modal-footer"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
				<button
					type="button"
					className="dms-btn dms-btn-secondary"
					onClick={onSendPreAuthRequest}
					title="Отправить список услуг на согласование куратору страховой компании"
				>
					<Send size={15} />
					<span>Отправить запрос на согласование</span>
				</button>

				<button
					type="button"
					className="dms-btn dms-btn-secondary"
					onClick={onAttachToCurrentVisit}
					title="Сохранить и сразу привязать гарантийное письмо к текущему визиту пациента"
				>
					<Link2 size={15} />
					<span>Привязать к текущему визиту</span>
				</button>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
				<button
					type="button"
					className="dms-btn dms-btn-secondary"
					onClick={onClose}
				>
					<span>Отмена</span>
				</button>

				{isEmergencyCare ? (
					<button
						type="button"
						className="dms-btn dms-btn-primary"
						style={{
							background: "var(--ok-fg, #059669)",
							borderColor: "var(--ok-fg, #059669)",
							fontWeight: 700,
						}}
						onClick={onSave}
						title="Применить экстренное согласование по острой боли и разблокировать приём"
					>
						<Zap size={16} />
						<span>1-Клик: Сохранить экстренное согласование</span>
					</button>
				) : (
					<button
						type="button"
						className="dms-btn dms-btn-primary"
						onClick={onSave}
						title="Сохранить параметры гарантийного письма ДМС"
					>
						<FileCheck size={16} />
						<span>Сохранить гарантийное письмо</span>
					</button>
				)}
			</div>
		</div>
	);
}
