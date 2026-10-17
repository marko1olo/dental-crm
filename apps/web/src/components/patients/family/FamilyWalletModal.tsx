/**
 * apps/web/src/components/patient/FamilyWalletModal.tsx
 *
 * Семейный общий кошелек (Family Wallet) и распределение баланса.
 * Реализует требования THE HAMMER, Мандата 8b (фасад <= 120 строк) и Apple HIG.
 * Тонкий канонический фасад, делегирующий логику модулям в ./familyWalletModal.
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
	FamilyWalletModalView,
	useFamilyWalletLogic,
	type FamilyGroupDetails,
	type FamilyMemberItem,
	type FamilyWalletModalProps,
	type FamilyWalletTab,
} from "./familyWalletModal/index";

export type {
	FamilyMemberItem,
	FamilyGroupDetails,
	FamilyWalletModalProps,
	FamilyWalletTab,
};

export const FamilyWalletModal: React.FC<FamilyWalletModalProps> = React.memo(
	function FamilyWalletModal(props) {
		const { isOpen, onClose, patientId, patientName, className = "" } = props;
		const logic = useFamilyWalletLogic(props);

		// Закрытие по Escape
		useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape" && isOpen) {
					onClose();
				}
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		if (!isOpen) return null;

		const modalContent = (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs"
				style={{
					backgroundColor: "rgba(15, 23, 42, 0.45)",
					backdropFilter: "blur(3px)",
				}}
				role="dialog"
				aria-modal="true"
				aria-labelledby="family-wallet-modal-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
				data-testid="family-wallet-modal-backdrop"
			>
				<FamilyWalletModalView
					logic={logic}
					patientId={patientId}
					patientName={patientName}
					className={className}
				/>
			</div>
		);

		return typeof document !== "undefined" && document.body
			? createPortal(modalContent, document.body)
			: modalContent;
	},
);

export default FamilyWalletModal;
