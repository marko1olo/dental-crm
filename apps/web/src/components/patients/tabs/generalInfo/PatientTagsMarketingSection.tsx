import React from "react";
import { ChevronDown, Megaphone, Stethoscope, Tag } from "lucide-react";
import { STOMX_MARKETING_SOURCES_CATALOG } from "@dental/shared";
import { DOCTOR_CLINICAL_TAGS, REGISTRY_SERVICE_TAGS } from "./constants";
import type { PatientTagsMarketingSectionProps } from "./types";

export const PatientTagsMarketingSection: React.FC<PatientTagsMarketingSectionProps> = React.memo(
	function PatientTagsMarketingSection({
		patient,
		onUpdatePatient,
		disabled = false,
		isOpen = false,
		onToggle,
		summary = "Заметок нет",
		onToggleServiceTag,
		onAppendDoctorTag,
	}) {
		return (
			<div
				className={`rounded-xl bg-[var(--paper)] border transition-all overflow-hidden ${
					isOpen
						? "border-[var(--teal)]/40 ring-1 ring-[var(--teal)]/20 shadow-xs"
						: "border-[var(--glass-border)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper-soft)]/40 shadow-2xs"
				}`}
			>
				<button
					type="button"
					onClick={onToggle}
					className="w-full flex items-center justify-between p-3 sm:p-3.5 text-left cursor-pointer select-none transition-colors bg-transparent min-h-[44px]"
					data-testid="accordion-toggle-notes"
					aria-expanded={isOpen}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
							<Tag className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<span className="text-xs sm:text-sm font-bold text-[var(--ink)] block truncate">
								Заметки и особенности обслуживания
							</span>
							<span className="text-[11px] text-[var(--muted)] block truncate font-normal sm:hidden">
								{summary}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2.5 shrink-0 ml-2">
						<span
							className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold hidden sm:inline-block truncate max-w-[260px] md:max-w-xs transition-colors ${
								summary === "Заметок нет"
									? "bg-[var(--paper-soft)] border border-[var(--glass-border)] text-[var(--muted)]"
									: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold"
							}`}
						>
							{summary}
						</span>
						<ChevronDown
							className={`w-4 h-4 text-[var(--teal)] transition-transform duration-200 ${
								isOpen ? "rotate-180" : ""
							}`}
						/>
					</div>
				</button>

				{/* Раскрывающийся блок: Заметки регистратуры, врача и канал маркетинга */}
				<div
					className={
						isOpen
							? "p-3.5 sm:p-4 border-t border-[var(--glass-border)] flex flex-col gap-3.5 bg-[var(--paper)]"
							: "hidden"
					}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
						{/* Заметки регистратуры */}
						<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--glass-border)] shadow-2xs flex flex-col gap-2.5">
							<div className="flex items-center justify-between gap-1 flex-wrap">
								<div className="flex items-center gap-1.5">
									<Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
									<span className="text-xs font-bold text-[var(--ink)]">
										Служебная заметка для регистратуры:
									</span>
								</div>
								<span className="text-[10px] text-[var(--muted)] font-medium">Администраторы</span>
							</div>

							{/* Быстрые чипы тегов для регистратуры */}
							<div className="flex items-center gap-1.5 flex-wrap">
								{REGISTRY_SERVICE_TAGS.map((tag) => {
									const active =
										Array.isArray(patient?.serviceAlertTags) && patient.serviceAlertTags.includes(tag);
									return (
										<button
											key={tag}
											type="button"
											className={`min-h-[44px] sm:min-h-[28px] text-[11px] px-2 py-0.5 rounded-lg font-semibold transition-all border cursor-pointer inline-flex items-center gap-1 ${
												active
													? "bg-amber-500 text-white border-amber-600 shadow-2xs font-bold"
													: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
											}`}
											onClick={() => onToggleServiceTag(tag)}
											data-testid={`chip-service-tag-${tag}`}
											disabled={disabled}
										>
											<span>{tag}</span>
										</button>
									);
								})}
							</div>

							<textarea
								rows={2}
								className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.registryNotes ?? patient?.notes ?? ""}
								onChange={(e) => {
									onUpdatePatient?.("registryNotes", e.target.value);
									onUpdatePatient?.("notes", e.target.value);
								}}
								placeholder="Особые пожелания по времени, конфликтность, звонки с напоминанием..."
								disabled={disabled}
								data-testid="textarea-registry-notes"
							/>
						</div>

						{/* Клинические особенности врача */}
						<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--glass-border)] shadow-2xs flex flex-col gap-2.5">
							<div className="flex items-center justify-between gap-1 flex-wrap">
								<div className="flex items-center gap-1.5">
									<Stethoscope className="w-3.5 h-3.5 text-[var(--teal)]" />
									<span className="text-xs font-bold text-[var(--ink)]">
										Клинические особенности (Врач):
									</span>
								</div>
								<span className="text-[10px] text-[var(--muted)] font-medium">Кресло & ЭМК</span>
							</div>

							{/* Быстрые клинические маркеры */}
							<div className="flex items-center gap-1.5 flex-wrap">
								{DOCTOR_CLINICAL_TAGS.map((tag) => (
									<button
										key={tag}
										type="button"
										className="min-h-[44px] sm:min-h-[28px] text-[11px] px-2 py-0.5 rounded-lg font-semibold bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--glass-border)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-all cursor-pointer"
										onClick={() => onAppendDoctorTag(tag)}
										disabled={disabled}
									>
										<span>+ {tag}</span>
									</button>
								))}
							</div>

							<textarea
								rows={2}
								className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.doctorClinicalNotes ?? ""}
								onChange={(e) => onUpdatePatient?.("doctorClinicalNotes", e.target.value)}
								placeholder="Страх лечения, седация, аллерго-настороженность, особенности артикуляции..."
								disabled={disabled}
								data-testid="textarea-doctor-notes"
							/>
						</div>
					</div>

					{/* Канал привлечения пациента (Маркетинг / StomX) */}
					<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--glass-border)] shadow-2xs flex flex-col gap-2">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-2">
								<Megaphone className="w-3.5 h-3.5 text-[var(--teal)]" />
								<span className="font-bold text-xs text-[var(--ink)]">
									Канал привлечения пациента (Маркетинг):
								</span>
							</div>
							{patient?.acquisitionSource && (
								<span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
									{patient.acquisitionSource}
								</span>
							)}
						</div>

						<div className="flex items-center gap-1.5 flex-wrap py-1 min-w-0">
							{STOMX_MARKETING_SOURCES_CATALOG.slice(0, 9).map((src) => {
								const isSelected = patient?.acquisitionSource === src.nameRu;
								return (
									<button
										key={src.channel}
										type="button"
										data-testid={`chip-marketing-${src.channel}`}
										className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none ${
											isSelected
												? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
												: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]"
										}`}
										onClick={() => {
											if (disabled) return;
											onUpdatePatient?.("acquisitionSource", isSelected ? "" : src.nameRu);
										}}
										disabled={disabled}
									>
										<span>{src.nameRu}</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export default PatientTagsMarketingSection;
