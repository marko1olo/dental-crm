/**
 * PatientPassportAddressStep.tsx — Layer 1: Паспортные данные, адрес, СНИЛС, полис ОМС/ДМС.
 *
 * КОНТЕКСТ & МАНДАТ:
 * - СНИЛС для Госуслуг и электронной медкарты (без птичьего языка).
 * - Динамический лейбл для несовершеннолетних (<14 лет: Свидетельство о рождении / Паспорт РФ).
 * - Форматирование паспорта, СНИЛС и полиса на лету.
 */

import { FileText, ShieldCheck } from "lucide-react";
import React from "react";
import {
	formatOmsPolicy,
	formatRussianPassport,
	formatSnils,
} from "../../../utils/inputSanitation";
import type { PatientPassportAddressStepProps } from "./types";

export function PatientPassportAddressStep({
	fieldRequirements,
	validationErrors,
	isMinorUnder14,
	showDocFields,
	onToggleDocFields,
	snils,
	onSnilsChange,
	insurancePolicyNumber,
	onInsurancePolicyNumberChange,
	identityDocument,
	onIdentityDocumentChange,
}: PatientPassportAddressStepProps) {
	return (
		<div className="create-patient-doc-section mt-3 pt-3 border-t border-[var(--glass-border)]">
			<button
				type="button"
				className="create-patient-doc-toggle-btn text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1.5 min-h-[36px] bg-transparent border-0 cursor-pointer"
				onClick={onToggleDocFields}
			>
				<FileText size={15} aria-hidden="true" />
				<span>
					{showDocFields
						? "Скрыть реквизиты документов"
						: fieldRequirements.requireSnils
							? "+ Добавить СНИЛС (ОБЯЗАТЕЛЕН ПО НАСТРОЙКЕ), ОМС или Паспорт"
							: "+ Добавить СНИЛС, ОМС или Паспорт"}
				</span>
			</button>

			{(showDocFields ||
				fieldRequirements.requireSnils ||
				fieldRequirements.requireIdentityDocument) && (
				<div className="create-patient-grid-2 mt-2 gap-3">
					<div className="create-patient-form-field">
						<label
							htmlFor="patient-create-snils"
							className="create-patient-label flex items-center gap-1"
						>
							<ShieldCheck size={13} className="text-[var(--teal)]" />
							СНИЛС{" "}
							{fieldRequirements.requireSnils ? (
								<span className="text-rose-500 font-bold">* (для Госуслуг)</span>
							) : (
								<span className="text-xs text-[var(--muted)] font-normal">
									(опция)
								</span>
							)}
						</label>
						<input
							id="patient-create-snils"
							inputMode="numeric"
							placeholder="000-000-000 00"
							value={snils || ""}
							onChange={(e) => onSnilsChange(formatSnils(e.target.value))}
							className={`create-patient-input ${validationErrors.snils ? "border-rose-500" : ""}`}
							aria-invalid={!!validationErrors.snils}
						/>
						{validationErrors.snils && (
							<span className="text-xs text-rose-500 font-semibold mt-1">
								{validationErrors.snils}
							</span>
						)}
						<span className="text-[10px] text-[var(--muted)] block mt-0.5">
							Не блокирует регистрацию. Требуется для электронной
							медкарты и Госуслуг.
						</span>
					</div>

					<div className="create-patient-form-field">
						<label
							htmlFor="patient-create-oms"
							className="create-patient-label"
						>
							Полис ОМС / ДМС
						</label>
						<input
							id="patient-create-oms"
							placeholder="Номер полиса"
							value={insurancePolicyNumber || ""}
							onChange={(e) =>
								onInsurancePolicyNumberChange(formatOmsPolicy(e.target.value))
							}
							className="create-patient-input"
						/>
					</div>

					<div className="create-patient-form-field create-patient-full-width">
						<label
							htmlFor="patient-create-passport"
							className="create-patient-label"
						>
							{isMinorUnder14
								? "Свидетельство о рождении / Паспорт РФ"
								: "Паспорт РФ"}{" "}
							{fieldRequirements.requireIdentityDocument ? (
								<span className="text-rose-500 font-bold">*</span>
							) : (
								<span className="text-xs text-[var(--muted)] font-normal">
									(опция)
								</span>
							)}
						</label>
						<input
							id="patient-create-passport"
							placeholder={
								isMinorUnder14
									? "Серия (римские) № 000000 или паспорт"
									: "Серия и номер 0000 000000"
							}
							value={identityDocument || ""}
							onChange={(e) =>
								onIdentityDocumentChange(formatRussianPassport(e.target.value))
							}
							className={`create-patient-input ${validationErrors.identityDocument ? "border-rose-500" : ""}`}
							aria-invalid={!!validationErrors.identityDocument}
						/>
						{validationErrors.identityDocument && (
							<span className="text-xs text-rose-500 font-semibold mt-1">
								{validationErrors.identityDocument}
							</span>
						)}
						<span className="text-[10px] text-[var(--muted)] block mt-0.5">
							Не блокирует регистрацию. Можно внести позже при
							оформлении договора.
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
