import React, { useState, useMemo } from "react";
import {
	AlertTriangle,
	Flame,
	Heart,
	Activity,
	Crown,
	UserX,
	Shield,
	Smile,
	UserCheck,
	Stethoscope,
	Accessibility,
	DollarSign,
	Users,
	Tag,
	Plus,
	X,
	Check,
} from "lucide-react";
import {
	PATIENT_TAGS_CATALOG,
	PATIENT_TAGS_MAP,
	PATIENT_TAG_CATEGORY_METAS,
	getTagBadgeStyle,
	type PatientTagCode,
	type PatientTagMeta,
} from "@dental/shared";

interface PatientWorkspaceTagsBarProps {
	patientId: string;
	initialTags?: string[] | null | undefined;
	onTagsChanged?: (newTags: string[]) => void;
	readOnly?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
	AlertTriangle,
	Flame,
	Heart,
	Activity,
	Crown,
	UserX,
	Shield,
	Smile,
	UserCheck,
	Stethoscope,
	Accessibility,
	DollarSign,
	Users,
};

export const PatientWorkspaceTagsBar: React.FC<PatientWorkspaceTagsBarProps> = React.memo(
	function PatientWorkspaceTagsBar({
		patientId,
		initialTags,
		onTagsChanged,
		readOnly = false,
	}) {
		const [tags, setTags] = useState<string[]>(() => {
			if (Array.isArray(initialTags) && initialTags.length > 0) return initialTags;
			return ["allergy", "vip"];
		});

		const [isModalOpen, setIsModalOpen] = useState(false);
		const [searchQuery, setSearchQuery] = useState("");
		const [draftTags, setDraftTags] = useState<string[]>(tags);

		const activeMetas = useMemo(() => {
			return tags
				.map((t) => PATIENT_TAGS_MAP[t as PatientTagCode])
				.filter((meta): meta is PatientTagMeta => Boolean(meta));
		}, [tags]);

		const filteredCatalog = useMemo(() => {
			const q = searchQuery.trim().toLowerCase();
			if (!q) return PATIENT_TAGS_CATALOG;
			return PATIENT_TAGS_CATALOG.filter(
				(tag) =>
					tag.code.toLowerCase().includes(q) ||
					tag.labelRu.toLowerCase().includes(q) ||
					tag.descriptionRu.toLowerCase().includes(q),
			);
		}, [searchQuery]);

		const handleOpenModal = () => {
			if (readOnly) return;
			setDraftTags([...tags]);
			setIsModalOpen(true);
		};

		const handleToggleDraftTag = (code: string) => {
			setDraftTags((prev) =>
				prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
			);
		};

		const handleSave = () => {
			setTags(draftTags);
			setIsModalOpen(false);
			onTagsChanged?.(draftTags);
			window.dispatchEvent(
				new CustomEvent("dente-patient-tags-updated", {
					detail: { patientId, tags: draftTags },
				}),
			);
		};

		const handleRemoveTag = (e: React.MouseEvent, code: string) => {
			e.stopPropagation();
			if (readOnly) return;
			const next = tags.filter((t) => t !== code);
			setTags(next);
			onTagsChanged?.(next);
		};

		return (
			<div className="flex items-center gap-1.5 flex-wrap" data-testid="patient-tags-badges-bar">
				{activeMetas.map((meta) => {
					const IconComp = ICON_MAP[meta.iconName] || Tag;
					const badgeStyle = getTagBadgeStyle(meta.code, false);

					return (
						<span
							key={meta.code}
							style={{
								color: badgeStyle.color,
								backgroundColor: badgeStyle.backgroundColor,
								borderColor: badgeStyle.borderColor,
							}}
							className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 transition-colors shadow-2xs select-none"
							title={meta.descriptionRu}
							data-testid={`patient-tag-badge-${meta.code}`}
						>
							<IconComp size={12} className="shrink-0" />
							<span>{meta.labelRu}</span>
							{!readOnly && (
								<button
									type="button"
									onClick={(e) => handleRemoveTag(e, meta.code)}
									className="hover:opacity-70 ml-0.5 p-0.5 rounded-xs transition-opacity cursor-pointer inline-flex items-center justify-center"
									title={`Удалить метку ${meta.labelRu}`}
									aria-label={`Удалить ${meta.labelRu}`}
								>
									<X size={10} />
								</button>
							)}
						</span>
					);
				})}

				{!readOnly && (
					<button
						type="button"
						onClick={handleOpenModal}
						className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-dashed border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--teal)] hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer"
						data-testid="patient-workspace-add-tag-btn"
						title="Управление клиническими и сервисными метками пациента"
					>
						<Plus size={11} className="shrink-0 text-[var(--teal)]" />
						<span>Тег</span>
					</button>
				)}

				{isModalOpen && (
					<div
						className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
						data-testid="patient-tags-management-modal"
						role="dialog"
						aria-modal="true"
					>
						<div
							className="w-full max-w-lg bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)]">
								<div className="flex items-center gap-2">
									<div className="w-7 h-7 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20 flex items-center justify-center">
										<Tag size={14} />
									</div>
									<div>
										<h3 className="text-sm font-bold text-[var(--ink)]">
											Метки и особенности пациента
										</h3>
										<p className="text-[11px] text-[var(--muted)]">
											Клинические алерты, финансовые статусы и сервис
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
									aria-label="Закрыть"
								>
									<X size={16} />
								</button>
							</div>

							{/* Search input */}
							<div className="p-3 border-b border-[var(--line)]">
								<input
									type="text"
									placeholder="Поиск по меткам (аллергия, VIP, долг...)"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-hidden focus:border-[var(--teal)] transition-colors"
									data-testid="input-search-patient-tags"
								/>
							</div>

							{/* Categories & tags list */}
							<div className="p-4 overflow-y-auto flex flex-col gap-4">
								{PATIENT_TAG_CATEGORY_METAS.map((catMeta) => {
									const catTags = filteredCatalog.filter((t) => t.category === catMeta.category);
									if (catTags.length === 0) return null;

									return (
										<div key={catMeta.category} className="flex flex-col gap-1.5">
											<div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted)] border-b border-[var(--line-subtle)] pb-1">
												<span>{catMeta.titleRu}</span>
												<span className="font-normal text-[10px]">{catTags.length}</span>
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
												{catTags.map((tag) => {
													const isChecked = draftTags.includes(tag.code);
													const IconComp = ICON_MAP[tag.iconName] || Tag;
													const badgeStyle = getTagBadgeStyle(tag.code, false);

													return (
														<button
															key={tag.code}
															type="button"
															onClick={() => handleToggleDraftTag(tag.code)}
															className={`flex items-start gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
																isChecked
																	? "border-[var(--teal)] bg-[var(--teal)]/8 ring-1 ring-[var(--teal)]/20"
																	: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
															}`}
															data-testid={`btn-toggle-tag-${tag.code}`}
														>
															<span
																style={{
																	color: badgeStyle.color,
																	backgroundColor: badgeStyle.backgroundColor,
																}}
																className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
															>
																<IconComp size={13} />
															</span>
															<div className="min-w-0 flex-1">
																<div className="flex items-center justify-between gap-1">
																	<span className="text-xs font-semibold text-[var(--ink)] truncate">
																		{tag.labelRu}
																	</span>
																	{isChecked && (
																		<Check size={13} className="text-[var(--teal)] shrink-0" />
																	)}
																</div>
																<p className="text-[10px] text-[var(--muted)] line-clamp-1">
																	{tag.descriptionRu}
																</p>
															</div>
														</button>
													);
												})}
											</div>
										</div>
									);
								})}
							</div>

							{/* Footer with exactly 1 Primary CTA */}
							<div className="flex items-center justify-between px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)]">
								<span className="text-xs text-[var(--muted)]">
									Выбрано: <strong className="text-[var(--ink)]">{draftTags.length}</strong>
								</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setIsModalOpen(false)}
										className="px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
									>
										Отмена
									</button>
									<button
										type="button"
										onClick={handleSave}
										className="px-4 py-1.5 text-xs font-bold bg-[var(--teal)] text-white rounded-lg shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer"
										data-testid="btn-save-patient-tags"
									>
										Сохранить метки
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	},
);

PatientWorkspaceTagsBar.displayName = "PatientWorkspaceTagsBar";
