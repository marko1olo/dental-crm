import React, { useMemo } from "react";
import { AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { STOMX_REPRESENTATIVE_CATALOG } from "./constants";
import { formatPhoneNumber } from "../../../../utils/inputSanitation";
import type { PatientRepresentativesSectionProps } from "./types";

export const PatientRepresentativesSection: React.FC<PatientRepresentativesSectionProps> = React.memo(
	function PatientRepresentativesSection({
		patient,
		onUpdatePatient,
		disabled = false,
		mode = "compact",
	}) {
		const selectedRep = useMemo(() => {
			if (!patient?.representativeType) return null;
			return (
				STOMX_REPRESENTATIVE_CATALOG.find(
					(r) => r.nameRu === patient.representativeType || r.code === patient.representativeType,
				) ?? null
			);
		}, [patient?.representativeType]);

		if (mode === "full") {
			return (
				<div className="flex flex-col gap-5 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] shadow-xs">
					<div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
						<div className="flex items-center gap-2.5">
							<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
								<Users className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-sm font-black m-0 text-[var(--ink)]">
									Законный представитель / Член семьи
								</h3>
								<p className="text-[11px] text-[var(--muted)] m-0">
									Правовая основа подписания согласий за несовершеннолетних и доступ к семейному счету
								</p>
							</div>
						</div>
						<span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
							Юридический статус
						</span>
					</div>

					{/* Каталог представителей */}
					<div className="p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--glass-border)] flex flex-col gap-2.5">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-2">
								<Users className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
								<span className="font-bold text-xs text-[var(--ink)]">
									Статус представителя / Член семьи:
								</span>
							</div>
							{patient?.representativeType && (
								<span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--teal)]">
									{patient.representativeType}
								</span>
							)}
						</div>

						<div className="flex items-center gap-1.5 flex-wrap py-1 min-w-0">
							{STOMX_REPRESENTATIVE_CATALOG.map((rep) => {
								const isSelected =
									patient?.representativeType === rep.nameRu ||
									patient?.representativeType === rep.code;
								return (
									<button
										key={rep.code}
										type="button"
										data-testid={`chip-representative-${rep.code}`}
										className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none ${
											isSelected
												? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
												: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]"
										}`}
										style={{
											height: "28px",
											padding: "0 10px",
											borderRadius: "8px",
											border: isSelected
												? "1px solid var(--teal)"
												: "1px solid var(--line-strong, var(--line))",
											background: isSelected ? "var(--teal)" : "var(--paper-soft)",
											color: isSelected ? "var(--on-teal, #ffffff)" : "var(--ink)",
										}}
										onClick={() => {
											if (disabled) return;
											onUpdatePatient?.("representativeType", isSelected ? "" : rep.nameRu);
										}}
										disabled={disabled}
										title={
											rep.isLegalRepresentative
												? `${rep.nameRu}: Законный представитель ребёнка (Право подписи согласий)`
												: `${rep.nameRu}: Член семьи (Для подписи ИДС за несовершеннолетнего требуется нотариальная доверенность)`
										}
									>
										<span>{rep.nameRu}</span>
										{rep.isLegalRepresentative && (
											<span
												className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
													isSelected
														? "bg-white/20 text-white"
														: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
												}`}
											>
												ИДС
											</span>
										)}
									</button>
								);
							})}
						</div>

						{/* Правовой вердикт */}
						{selectedRep && (
							<div
								className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
									selectedRep.isLegalRepresentative
										? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
										: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
								}`}
								data-testid="representative-ids-signing-badge"
							>
								<div className="flex items-center gap-2">
									{selectedRep.isLegalRepresentative ? (
										<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									) : (
										<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
									)}
									<span>
										{selectedRep.isLegalRepresentative ? (
											<>
												<strong>Законный представитель ребёнка:</strong> Имеет безусловное законное право подписывать информированное добровольное согласие (ИДС) за несовершеннолетнего.
											</>
										) : (
											<>
												<strong>Член семьи (не является законным представителем):</strong> Для подписания ИДС за несовершеннолетнего требуется нотариальная доверенность.
											</>
										)}
									</span>
								</div>
								<span
									className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 border ${
										selectedRep.isLegalRepresentative
											? "bg-emerald-600 text-white border-emerald-700"
											: "bg-amber-600 text-white border-amber-700"
									}`}
								>
									{selectedRep.isLegalRepresentative ? "Право подписи ИДС: ДА" : "ИДС: по доверенности"}
								</span>
							</div>
						)}

						{patient?.representativeType && (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[var(--glass-border)]">
								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)]">
										ФИО представителя
									</label>
									<input
										type="text"
										className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
										value={patient?.representativeFullName ?? ""}
										onChange={(e) => onUpdatePatient?.("representativeFullName", e.target.value)}
										placeholder="Фамилия Имя Отчество"
										disabled={disabled}
										data-testid="input-representative-fullname"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)]">
										Телефон представителя
									</label>
									<input
										type="tel"
										className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
										value={patient?.representativePhone ?? ""}
										onChange={(e) => onUpdatePatient?.("representativePhone", formatPhoneNumber(e.target.value))}
										placeholder="+7 (___) ___-__-__"
										disabled={disabled}
										data-testid="input-representative-phone"
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label className="text-[11px] font-bold text-[var(--muted)]">
										Документ-основание (Свид-во / Доверенность)
									</label>
									<input
										type="text"
										className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
										value={patient?.representativeDoc ?? ""}
										onChange={(e) => onUpdatePatient?.("representativeDoc", e.target.value)}
										placeholder="Свидетельство II-МЮ №123456 / Доверенность 77 АБ 1234"
										disabled={disabled}
										data-testid="input-representative-doc"
									/>
								</div>
							</div>
						)}
					</div>

					{/* Получатель документов и согласие на обработку ПДн */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
						<div className="flex flex-col gap-1">
							<label className="text-xs font-bold text-[var(--ink)]">
								Кому выдавать медицинскую документацию и справки:
							</label>
							<select
								className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)]"
								value={patient?.preferredDocumentRecipient ?? "Лично пациенту"}
								onChange={(e) => onUpdatePatient?.("preferredDocumentRecipient", e.target.value)}
								disabled={disabled}
							>
								<option value="Лично пациенту">Лично пациенту</option>
								<option value="Законному представителю">Законному представителю</option>
								<option value="По нотариальной доверенности">По нотариальной доверенности</option>
							</select>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-xs font-bold text-[var(--ink)]">
								Основание обработки персональных данных:
							</label>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)]"
								value={patient?.dataProcessingBasisNote ?? "Согласие на ОПД от первичного приема"}
								onChange={(e) => onUpdatePatient?.("dataProcessingBasisNote", e.target.value)}
								placeholder="Согласие на ОПД №..."
								disabled={disabled}
							/>
						</div>
					</div>
				</div>
			);
		}

		// Mode: compact (для базовой карточки — без вложенной рамки-матрёшки)
		return (
			<div
				className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]"
				style={{ borderTop: "1px solid var(--line)", paddingTop: "12px" }}
			>
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<Users className="w-3.5 h-3.5 text-[var(--teal)]" />
						<span className="font-bold text-xs text-[var(--ink)]">
							Законный представитель / Член семьи:
						</span>
					</div>
					{patient?.representativeType && (
						<span className="text-[11px] px-2 py-0.5 rounded-full font-bold border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--teal)]">
							{patient.representativeType}
						</span>
					)}
				</div>

				{/* Чипы представителей */}
				<div className="flex items-center gap-1.5 flex-wrap py-0.5 min-w-0">
					{STOMX_REPRESENTATIVE_CATALOG.map((rep) => {
						const isSelected =
							patient?.representativeType === rep.nameRu ||
							patient?.representativeType === rep.code;
						return (
							<button
								key={rep.code}
								type="button"
								data-testid={`chip-representative-${rep.code}`}
								className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none ${
									isSelected
										? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
										: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]"
								}`}
								style={{
									height: "28px",
									padding: "0 10px",
									borderRadius: "8px",
									border: isSelected
										? "1px solid var(--teal)"
										: "1px solid var(--line-strong, var(--line))",
									background: isSelected ? "var(--teal)" : "var(--paper-soft)",
									color: isSelected ? "var(--on-teal, #ffffff)" : "var(--ink)",
								}}
								onClick={() => {
									if (disabled) return;
									onUpdatePatient?.("representativeType", isSelected ? "" : rep.nameRu);
								}}
								disabled={disabled}
								title={
									rep.isLegalRepresentative
										? `${rep.nameRu}: Законный представитель ребёнка (Право подписи согласий)`
										: `${rep.nameRu}: Член семьи (Для подписи ИДС за несовершеннолетнего требуется нотариальная доверенность)`
								}
							>
								<span>{rep.nameRu}</span>
								{rep.isLegalRepresentative && (
									<span
										className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
											isSelected
												? "bg-white/20 text-white"
												: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
										}`}
									>
										ИДС
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* Статус подписания согласий */}
				{selectedRep && (
					<div
						className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-3 ${
							selectedRep.isLegalRepresentative
								? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
								: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
						}`}
						data-testid="representative-ids-signing-badge"
					>
						<div className="flex items-center gap-2">
							{selectedRep.isLegalRepresentative ? (
								<ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							) : (
								<AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
							)}
							<span className="text-[11px]">
								{selectedRep.isLegalRepresentative ? (
									<>
										<strong>Законный представитель:</strong> Право подписи согласий на приём и лечение.
									</>
								) : (
									<>
										<strong>Член семьи:</strong> Подписание согласий требует нотариальной доверенности от родителей.
									</>
								)}
							</span>
						</div>
						<span
							className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 border ${
								selectedRep.isLegalRepresentative
									? "bg-emerald-600 text-white border-emerald-700"
									: "bg-amber-600 text-white border-amber-700"
							}`}
						>
							{selectedRep.isLegalRepresentative ? "Согласие: ДА" : "Требуется доверенность"}
						</span>
					</div>
				)}

				{patient?.representativeType && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--glass-border)]">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted)]">
								ФИО представителя
							</label>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.representativeFullName ?? ""}
								onChange={(e) => onUpdatePatient?.("representativeFullName", e.target.value)}
								placeholder="Фамилия Имя Отчество"
								disabled={disabled}
								data-testid="input-representative-fullname"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted)]">
								Телефон представителя
							</label>
							<input
								type="tel"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.representativePhone ?? ""}
								onChange={(e) => onUpdatePatient?.("representativePhone", formatPhoneNumber(e.target.value))}
								placeholder="+7 (___) ___-__-__"
								disabled={disabled}
								data-testid="input-representative-phone"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted)]">
								Документ-основание (Свид-во / Доверенность)
							</label>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.representativeDoc ?? ""}
								onChange={(e) => onUpdatePatient?.("representativeDoc", e.target.value)}
								placeholder="Свидетельство II-МЮ №123456"
								disabled={disabled}
								data-testid="input-representative-doc"
							/>
						</div>
					</div>
				)}
			</div>
		);
	},
);

export default PatientRepresentativesSection;
