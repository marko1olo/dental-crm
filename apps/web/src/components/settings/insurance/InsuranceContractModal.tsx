/**
 * apps/web/src/components/settings/insurance/InsuranceContractModal.tsx
 *
 * Модальное окно добавления/редактирования договора ДМС клиники:
 * - Выбор из быстрых пресетов топ-страховщиков РФ (СОГАЗ, Ингосстрах, РЕСО, АльфаСтрахование, Росгосстрах, ВСК)
 * - Название и маска полиса
 * - Покрытие по категориям (Терапия, Хирургия, Ортодонтия, Гигиена)
 * - Франшиза / со-платеж пациента (0%, 10%, 20%, 30%)
 * - Требование гарантийного письма (ГП)
 * - Годовой лимит в рублях
 *
 * Мандаты 8b, 8d: строго <= 800 строк, ноль мультяшных эмодзи.
 */

import { Building2, FileCheck2, Percent, ShieldCheck, X } from "lucide-react";
import type React from "react";
import type { InsuranceContract } from "../insuranceContractsPanelData";

export interface ContractFormData {
	companyName: string;
	policyNumberMask: string;
	coverageTherapyPct: string;
	coverageSurgeryPct: string;
	coverageOrthoPct: string;
	coverageHygienePct: string;
	annualLimitRub: string;
	patientFranchisePct: string;
	requiresGuaranteeLetter: boolean;
}

export interface InsuranceContractModalProps {
	isOpen: boolean;
	isSaving: boolean;
	editingContract: InsuranceContract | null;
	formData: ContractFormData;
	setFormData: React.Dispatch<React.SetStateAction<ContractFormData>>;
	onClose: () => void;
	onSave: (e: React.FormEvent) => void;
}

const TOP_INSURERS_PRESETS = [
	{
		name: "АО «СОГАЗ»",
		mask: "СГЗ-####-######",
		limit: "100000",
		therapy: "100",
		surgery: "100",
		ortho: "50",
		hygiene: "100",
		franchise: "0",
		requiresLetter: true,
	},
	{
		name: "СПАО «Ингосстрах»",
		mask: "ИНГ-####-######",
		limit: "80000",
		therapy: "100",
		surgery: "80",
		ortho: "40",
		hygiene: "100",
		franchise: "10",
		requiresLetter: true,
	},
	{
		name: "СПАО «РЕСО-Гарантия»",
		mask: "РЕС-####-######",
		limit: "90000",
		therapy: "100",
		surgery: "90",
		ortho: "50",
		hygiene: "100",
		franchise: "0",
		requiresLetter: true,
	},
	{
		name: "АО «АльфаСтрахование»",
		mask: "АЛЬФА-####-######",
		limit: "120000",
		therapy: "100",
		surgery: "100",
		ortho: "60",
		hygiene: "100",
		franchise: "20",
		requiresLetter: false,
	},
	{
		name: "ПАО СК «Росгосстрах»",
		mask: "РГС-####-######",
		limit: "70000",
		therapy: "100",
		surgery: "70",
		ortho: "30",
		hygiene: "100",
		franchise: "30",
		requiresLetter: true,
	},
	{
		name: "САО «ВСК»",
		mask: "ВСК-####-######",
		limit: "85000",
		therapy: "100",
		surgery: "85",
		ortho: "40",
		hygiene: "100",
		franchise: "0",
		requiresLetter: false,
	},
];

const STANDARD_FRANCHISE_OPTIONS = [
	{ value: "0", label: "0% (100% ДМС)", desc: "Полное покрытие страховой компанией" },
	{ value: "10", label: "10%", desc: "10% пациент, 90% ДМС" },
	{ value: "20", label: "20%", desc: "20% пациент, 80% ДМС" },
	{ value: "30", label: "30%", desc: "30% пациент, 70% ДМС" },
];

export const InsuranceContractModal: React.FC<InsuranceContractModalProps> = ({
	isOpen,
	isSaving,
	editingContract,
	formData,
	setFormData,
	onClose,
	onSave,
}) => {
	if (!isOpen) return null;

	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

	const coverageCategories: Array<{
		label: string;
		key: keyof Pick<
			ContractFormData,
			"coverageTherapyPct" | "coverageSurgeryPct" | "coverageOrthoPct" | "coverageHygienePct"
		>;
	}> = [
		{ label: "Терапия", key: "coverageTherapyPct" },
		{ label: "Хирургия", key: "coverageSurgeryPct" },
		{ label: "Ортодонтия", key: "coverageOrthoPct" },
		{ label: "Гигиена", key: "coverageHygienePct" },
	];

	return (
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
				width: "100%",
				padding: 16,
			}}
			onClick={(e) => e.target === e.currentTarget && onClose()}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			tabIndex={-1}
		>
			<div
				style={{
					background: paperBg,
					width: 560,
					maxWidth: "calc(100% - 32px)",
					maxHeight: "92vh",
					overflowY: "auto",
					borderRadius: 20,
					padding: 24,
					border: `1px solid ${borderColor}`,
					boxShadow: "0 32px 64px rgba(0,0,0,0.3)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 20,
					}}
				>
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<ShieldCheck size={20} />
						</div>
						<div>
							<h3
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{editingContract
									? "Редактировать договор ДМС"
									: "Новый договор ДМС"}
							</h3>
							<span style={{ fontSize: 12, color: "var(--muted)" }}>
								Условия страхового покрытия, франшиза и гарантийные письма
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							fontSize: 20,
							cursor: "pointer",
							color: "var(--muted)",
							padding: 4,
							borderRadius: 6,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				<form
					onSubmit={onSave}
					style={{ display: "flex", flexDirection: "column", gap: 16 }}
				>
					{/* 1-клик шаблоны договоров топ-страховщиков */}
					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
							Быстрые шаблоны договоров ДМС:
						</span>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
							{TOP_INSURERS_PRESETS.map((tmpl) => (
								<button
									key={tmpl.name}
									type="button"
									onClick={() => {
										setFormData((prev) => ({
											...prev,
											companyName: tmpl.name,
											policyNumberMask: tmpl.mask,
											annualLimitRub: tmpl.limit,
											coverageTherapyPct: tmpl.therapy,
											coverageSurgeryPct: tmpl.surgery,
											coverageOrthoPct: tmpl.ortho,
											coverageHygienePct: tmpl.hygiene,
											patientFranchisePct: tmpl.franchise,
											requiresGuaranteeLetter: tmpl.requiresLetter,
										}));
									}}
									style={{
										padding: "4px 8px",
										borderRadius: 6,
										border: "1px solid var(--line, #e2e8f0)",
										background: "var(--paper-soft, #f8fafc)",
										fontSize: 12,
										fontWeight: 600,
										color: "var(--ink)",
										cursor: "pointer",
									}}
								>
									+ {tmpl.name}
								</button>
							))}
						</div>
					</div>

					{/* Company name */}
					<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
						<label
							htmlFor="insurance-company-name"
							style={{
								fontSize: 12,
								color: "var(--muted)",
								fontWeight: 600,
							}}
						>
							Страховая компания *
						</label>
						<input
							id="insurance-company-name"
							type="text"
							required
							value={formData.companyName}
							onChange={(e) =>
								setFormData({ ...formData, companyName: e.target.value })
							}
							style={{
								padding: "9px 12px",
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: paperSoftBg,
								color: "var(--ink)",
								fontSize: 13,
								outline: "none",
							}}
							placeholder="АО «СОГАЗ», СПАО «Ингосстрах»..."
						/>
					</div>

					{/* Policy mask & Annual limit */}
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
						<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
							<label
								htmlFor="insurance-policy-mask"
								style={{
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
								}}
							>
								Маска полиса (опционально)
							</label>
							<input
								id="insurance-policy-mask"
								type="text"
								value={formData.policyNumberMask}
								onChange={(e) =>
									setFormData({
										...formData,
										policyNumberMask: e.target.value,
									})
								}
								style={{
									padding: "9px 12px",
									borderRadius: 8,
									border: `1px solid ${borderColor}`,
									background: paperSoftBg,
									color: "var(--ink)",
									fontSize: 13,
									outline: "none",
								}}
								placeholder="ХХХХ-####-######"
							/>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
							<label
								htmlFor="insurance-annual-limit"
								style={{
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
								}}
							>
								Годовой лимит (₽)
							</label>
							<input
								id="insurance-annual-limit"
								type="number"
								min="0"
								value={formData.annualLimitRub}
								onChange={(e) =>
									setFormData({ ...formData, annualLimitRub: e.target.value })
								}
								style={{
									padding: "9px 12px",
									borderRadius: 8,
									border: `1px solid ${borderColor}`,
									background: paperSoftBg,
									color: "var(--ink)",
									fontSize: 13,
									outline: "none",
								}}
								placeholder="100000"
							/>
						</div>
					</div>

					{/* Patient Co-Pay / Franchise (0%, 10%, 20%, 30%) */}
					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<div className="flex items-center justify-between">
							<label
								htmlFor="franchise-chips-group"
								style={{
									fontSize: 12,
									color: "var(--muted)",
									fontWeight: 600,
								}}
							>
								Франшиза / Со-платеж пациента (доля пациента)
							</label>
							<span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
								{formData.patientFranchisePct}% пациента
							</span>
						</div>
						<div id="franchise-chips-group" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{STANDARD_FRANCHISE_OPTIONS.map((opt) => {
								const isSelected = formData.patientFranchisePct === opt.value;
								return (
									<button
										key={opt.value}
										type="button"
										onClick={() =>
											setFormData({ ...formData, patientFranchisePct: opt.value })
										}
										className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
											isSelected
												? "bg-emerald-500/15 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30 text-[var(--ink)]"
												: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:border-emerald-400"
										}`}
									>
										<span className="font-bold text-xs">{opt.label}</span>
										<span className="text-[10px] text-[var(--muted)] mt-0.5 leading-tight">
											{opt.desc}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Guarantee Letter Requirement Toggle */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "10px 14px",
							borderRadius: 10,
							background: paperSoftBg,
							border: `1px solid ${borderColor}`,
						}}
					>
						<div className="flex items-center gap-2.5">
							<FileCheck2 size={16} className="text-blue-500 shrink-0" />
							<div>
								<span className="text-xs font-bold text-[var(--ink)] block">
									Требуется гарантийное письмо (ГП)
								</span>
								<span className="text-[11px] text-[var(--muted)] block">
									Обязательное наличие согласованного письма от страховой на услуги
								</span>
							</div>
						</div>
						<input
							type="checkbox"
							id="insurance-requires-guarantee-letter"
							checked={formData.requiresGuaranteeLetter}
							onChange={(e) =>
								setFormData({
									...formData,
									requiresGuaranteeLetter: e.target.checked,
								})
							}
							className="w-4 h-4 rounded cursor-pointer accent-emerald-600"
						/>
					</div>

					{/* Coverage fields */}
					<div>
						<p
							style={{
								margin: "0 0 8px 0",
								fontSize: 12,
								fontWeight: 600,
								color: "var(--ink)",
							}}
						>
							Покрытие страховой компании по категориям (%)
						</p>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 10,
							}}
						>
							{coverageCategories.map(({ label, key }) => (
								<div
									key={key}
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 4,
									}}
								>
									<label
										htmlFor={`insurance-coverage-${key}`}
										style={{
											fontSize: 11,
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
											gap: 6,
										}}
									>
										<input
											id={`insurance-coverage-${key}`}
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
												padding: "8px 10px",
												borderRadius: 8,
												border: `1px solid ${borderColor}`,
												background: paperSoftBg,
												color: "var(--ink)",
												fontSize: 13,
												outline: "none",
											}}
										/>
										<span style={{ color: "var(--muted)", fontSize: 13 }}>
											%
										</span>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Submit button */}
					<button
						type="submit"
						className="primary-button"
						disabled={isSaving}
						style={{ justifyContent: "center", marginTop: 4, height: 40 }}
					>
						{isSaving
							? "Сохраняем…"
							: editingContract
								? "Сохранить изменения"
								: "Добавить договор"}
					</button>
				</form>
			</div>
		</div>
	);
};
