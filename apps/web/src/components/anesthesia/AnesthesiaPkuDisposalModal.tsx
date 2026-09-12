/**
 * AnesthesiaPkuDisposalModal.tsx
 * DENTE Dental CRM — Прозрачный фасад над каноническим NurseCarpuleDisposalModal (Мандаты 8s, 8e, 8i).
 * 1-клик быстрые пресеты списания анестезии и ПКУ (СанПиН 3.3686-21, п. 10).
 * Подпись медсестры / ассистента подтверждена в 1 клик без комиссии из 3 человек.
 */

import React from "react";
import {
	NurseCarpuleDisposalModal,
	type NurseCarpuleDisposalModalProps,
} from "../warehouse/NurseCarpuleDisposalModal";

export interface AnesthesiaPkuDisposalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDate?: string | undefined;
	readonly initialNurseName?: string | undefined;
	readonly initialDoctorName?: string | undefined;
	readonly currentStockAvailable?: number | undefined;
	readonly onDisposalConfirmed?: NurseCarpuleDisposalModalProps["onDisposalConfirmed"];
	readonly onSaveRecord?: ((record: unknown, actText: string) => void) | undefined;
	readonly [key: string]: unknown;
}

export function AnesthesiaPkuDisposalModal({
	isOpen,
	onClose,
	initialDate,
	initialNurseName,
	initialDoctorName,
	currentStockAvailable,
	onDisposalConfirmed,
}: AnesthesiaPkuDisposalModalProps) {
	return (
		<NurseCarpuleDisposalModal
			isOpen={isOpen}
			onClose={onClose}
			{...(initialDate !== undefined ? { initialDate } : {})}
			{...(initialNurseName !== undefined ? { initialNurseName } : {})}
			{...(initialDoctorName !== undefined ? { initialDoctorName } : {})}
			{...(currentStockAvailable !== undefined ? { currentStockAvailable } : {})}
			{...(onDisposalConfirmed !== undefined ? { onDisposalConfirmed } : {})}
		/>
	);
}

export default AnesthesiaPkuDisposalModal;
