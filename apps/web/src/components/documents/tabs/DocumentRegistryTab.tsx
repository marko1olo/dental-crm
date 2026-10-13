import React from "react";
import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentSourceStatus,
	DocumentStatus,
	GeneratedDocument,
} from "@dental/shared";
import {
	CheckCircle2,
	FileCheck,
	FileCode2,
	FileSignature,
	FileText,
	MoreHorizontal,
	Printer,
	Shield,
	X,
} from "lucide-react";
import {
	DocumentRegistryFilterBar,
	type DocumentStatusFilter,
	type DocumentEdsFilter,
} from "../DocumentRegistryFilterBar";
import type { DocumentCategoryTab } from "../DocumentNavTabs";
import { EmptyState } from "../../EmptyState";
import { CANONICAL_DOCUMENT_STATUS_LABELS, documentRowLifecycleGuidance } from "../documentAutonomy";

export interface DocumentRegistryTabProps {
	activeCategoryTab?: DocumentCategoryTab;
	registrySearchQuery: string;
	setRegistrySearchQuery: (val: string) => void;
	registryStatusFilter: DocumentStatusFilter;
	setRegistryStatusFilter: (val: DocumentStatusFilter) => void;
	registryEdsFilter: DocumentEdsFilter;
	setRegistryEdsFilter: (val: DocumentEdsFilter) => void;
	registryKindFilter: "all" | DocumentKind;
	setRegistryKindFilter: (val: "all" | DocumentKind) => void;
	typedActiveDocuments?: GeneratedDocument[];
	filteredActiveDocuments: GeneratedDocument[];
	availableRegistryKinds: Array<{ key: DocumentKind; label: string; count: number }>;
	setActiveCategoryTab: (tab: DocumentCategoryTab) => void;
	documentsSlice: {
		visibleItems: GeneratedDocument[];
		hasMore: boolean;
		remainingCount: number;
	};
	setDisplayLimit: React.Dispatch<React.SetStateAction<number>>;
	documentActionLabels?: Record<DocumentKind, string> | undefined;
	documentLabels?: Record<DocumentKind, string> | undefined;
	documentKindMetadata?: Record<DocumentKind, DocumentKindMetadata> | undefined;
	documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	documentSourceStatusClassNames?: Record<DocumentSourceStatus, string> | undefined;
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string> | undefined;
	documentAuditFactsLoadingId?: string | null | undefined;
	documentStatusSavingId?: string | null | undefined;
	formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	money?: ((val: number | null | undefined) => string) | undefined;
	requestDocumentIssue: (doc: GeneratedDocument) => void;
	downloadIssuedDocumentPdf: (id: string) => Promise<void> | void;
	openIssuedDocumentHtml: (id: string) => Promise<void> | void;
	openDocActionMenuId: string | null;
	setOpenDocActionMenuId: (id: string | null) => void;
	loadDocumentAuditFacts: (id: string) => Promise<void> | void;
	downloadIssuedDocumentHtml?: ((id: string) => Promise<void> | void) | undefined;
	handleDirectPrintDocumentA4?: ((id: string, title?: string) => Promise<void> | void) | undefined;
	downloadTaxDocumentXml?: ((id: string) => Promise<void> | void) | undefined;
	setIsFnsNdflXmlOpen?: ((open: boolean) => void) | undefined;
	setIsEgiszRemdOpen?: ((open: boolean) => void) | undefined;
	requestDocumentVoid: (doc: GeneratedDocument) => void;
}

export const DocumentRegistryTab: React.FC<DocumentRegistryTabProps> = React.memo(
	function DocumentRegistryTab(props) {
		const {
			activeCategoryTab,
			registrySearchQuery,
			setRegistrySearchQuery,
			registryStatusFilter,
			setRegistryStatusFilter,
			registryEdsFilter,
			setRegistryEdsFilter,
			registryKindFilter,
			setRegistryKindFilter,
			typedActiveDocuments,
			filteredActiveDocuments,
			availableRegistryKinds,
			setActiveCategoryTab,
			documentsSlice,
			setDisplayLimit,
			documentActionLabels,
			documentLabels,
			documentKindMetadata,
			documentStatusLabels,
			documentSourceStatusClassNames,
			documentSourceStatusLabels,
			documentAuditFactsLoadingId,
			documentStatusSavingId,
			formatShortDate,
			money,
			requestDocumentIssue,
			downloadIssuedDocumentPdf,
			openIssuedDocumentHtml,
			openDocActionMenuId,
			setOpenDocActionMenuId,
			loadDocumentAuditFacts,
			downloadIssuedDocumentHtml,
			handleDirectPrintDocumentA4,
			downloadTaxDocumentXml,
			setIsFnsNdflXmlOpen,
			setIsEgiszRemdOpen,
			requestDocumentVoid,
		} = props;

		return (
			<>
				<DocumentRegistryFilterBar
					activeCategoryTab={activeCategoryTab}
					searchQuery={registrySearchQuery}
					onSearchChange={setRegistrySearchQuery}
					statusFilter={registryStatusFilter}
					onStatusFilterChange={setRegistryStatusFilter}
					edsFilter={registryEdsFilter}
					onEdsFilterChange={setRegistryEdsFilter}
					kindFilter={registryKindFilter}
					onKindFilterChange={(val) => setRegistryKindFilter(val as "all" | DocumentKind)}
					totalCount={typedActiveDocuments?.length ?? 0}
					filteredCount={filteredActiveDocuments.length}
					availableKinds={availableRegistryKinds.map((k) => ({ kind: k.key, label: k.label }))}
					onResetFilters={() => {
						setRegistrySearchQuery("");
						setRegistryStatusFilter("all");
						setRegistryEdsFilter("all");
						setRegistryKindFilter("all");
						setActiveCategoryTab("all");
					}}
				/>

				<div className="document-list">
					{documentsSlice.visibleItems.map((document) => {
						const documentActionLabel =
							documentActionLabels?.[document.kind] ?? "Документ";
						const documentKindLabel =
							documentLabels?.[document.kind] ?? document.kind;
						const docSourceStatus =
							documentKindMetadata?.[document.kind]?.sourceStatus ??
							"manual_only";
						const documentTaxYearContext = document.taxYear
							? `, ${document.taxYear}`
							: "";
						const documentActionContext = `${documentActionLabel}: ${documentKindLabel}${documentTaxYearContext}`;
						const documentAuditLoading =
							documentAuditFactsLoadingId === document.id;
						const documentStatusSaving =
							documentStatusSavingId === document.id;
						const documentLifecycleGuidanceId = `document-lifecycle-guidance-${document.id}`;
						const documentLifecycleGuidance = documentRowLifecycleGuidance(
							document,
							documentSourceStatusLabels,
							documentKindMetadata,
						);
						const documentArchiveAvailable =
							(document.status === "issued" || document.status === "voided") &&
							Boolean(
								document.issuedSnapshotSha256 &&
									document.issuedSnapshotCreatedAt,
							);
						return (
							<article className="document-row" key={document.id}>
								<CheckCircle2 aria-hidden="true" />
								<div>
									<h3>{documentActionLabel}</h3>
									<p>
										{documentKindLabel} ·{" "}
										{documentStatusLabels?.[document.status] ??
											CANONICAL_DOCUMENT_STATUS_LABELS[document.status] ??
											document.status}
										<span
											className={
												documentSourceStatusClassNames?.[docSourceStatus] ??
												"pill-gray"
											}
										>
											{documentSourceStatusLabels?.[docSourceStatus] ??
												"Ручной ввод"}
										</span>
										{document.taxYear ? ` · ${document.taxYear}` : ""}
										{document.doctorSignedAt || document.cryptoSignaturePkcs7 ? (
											<span
												className="document-source-badge official-form border border-[var(--primary,#0d9488)] text-[var(--primary,#0d9488)] bg-[var(--primary,#0d9488)]/10 font-semibold rounded px-1.5 py-0.5 text-[11px]"
												title={`Подписано электронной подписью: ${document.doctorCertSubject || ""}${document.doctorCertSerial ? ` (${document.doctorCertSerial})` : ""}`}
											>
												Подписан ЭЦП
											</span>
										) : null}
										{document.issuedAt
											? ` ${typeof formatShortDate === "function" ? formatShortDate(document.issuedAt) : String(document.issuedAt)}`
											: ""}{" "}
										·{" "}
										{typeof money === "function"
											? money(document.totalAmountRub)
											: String(document.totalAmountRub)}
									</p>
									<small
										className="document-row-guidance"
										id={documentLifecycleGuidanceId}
									>
										{documentLifecycleGuidance}
									</small>
								</div>
								<fieldset
									className="document-actions flex items-center gap-1.5 m-0 p-0 border-0"
									aria-label={`Действия с документом: ${documentActionContext}`}
								>
									<legend className="sr-only">{`Действия с документом: ${documentActionContext}`}</legend>

									{document.status === "draft" ? (
										<button
											className="tactile-doc-btn tactile-doc-btn--primary doc-link min-h-[44px] sm:min-h-[36px] sm:h-8"
											type="button"
											disabled={documentStatusSaving}
											aria-busy={documentStatusSaving || undefined}
											onClick={() => requestDocumentIssue(document)}
											aria-describedby={documentLifecycleGuidanceId}
											aria-label={`Выдать на бумаге: ${documentActionContext}`}
											title={`Выдать на бумаге или подтвердить выдачу: ${documentActionContext}`}
											data-testid={`btn-issue-doc-${document.id}`}
										>
											<FileSignature size={14} className="shrink-0" aria-hidden="true" />
											<span>Выдать на бумаге</span>
										</button>
									) : (
										<button
											className="tactile-doc-btn tactile-doc-btn--secondary doc-link min-h-[44px] sm:min-h-[36px] sm:h-8"
											type="button"
											onClick={() =>
												void downloadIssuedDocumentPdf(document.id)
											}
											aria-describedby={documentLifecycleGuidanceId}
											aria-label={`Печать / Скачать PDF: ${documentActionContext}`}
											title={`Печать / Скачать PDF: ${documentActionContext}`}
											data-testid={`btn-pdf-doc-${document.id}`}
										>
											<Printer size={14} className="text-[var(--primary,#0d9488)] shrink-0" aria-hidden="true" />
											<span>Печать / PDF</span>
										</button>
									)}

									<button
										className="tactile-doc-btn tactile-doc-btn--ghost doc-link min-h-[44px] sm:min-h-[36px] sm:h-8"
										type="button"
										onClick={() => void openIssuedDocumentHtml(document.id)}
										aria-describedby={documentLifecycleGuidanceId}
										aria-label={`Открыть HTML документа: ${documentActionContext}`}
										title={`Открыть HTML документа: ${documentActionContext}`}
										data-testid={`btn-open-doc-${document.id}`}
									>
										<FileText size={14} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
										<span>Открыть</span>
									</button>

									<div className="relative inline-block">
										<button
											className="tactile-doc-btn tactile-doc-btn--icon doc-link document-row-actions-btn min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 inline-flex items-center justify-center px-1.5"
											type="button"
											onClick={() =>
												setOpenDocActionMenuId(
													openDocActionMenuId === document.id
														? null
														: document.id,
												)
											}
											aria-label={`Дополнительные действия с документом: ${documentActionContext}`}
											title="Дополнительные действия"
											aria-expanded={openDocActionMenuId === document.id}
										>
											<MoreHorizontal size={15} aria-hidden="true" />
										</button>

										{openDocActionMenuId === document.id && (
											<div className="document-row-actions-dropdown absolute right-0 top-[calc(100%+4px)] z-50 min-w-[220px] shadow-lg bg-[var(--paper)] border border-[var(--line)] rounded-xl p-1 flex flex-col gap-0.5">
												<button
													className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
													type="button"
													onClick={() => {
														setOpenDocActionMenuId(null);
														void loadDocumentAuditFacts(document.id);
													}}
													disabled={documentAuditLoading}
													aria-busy={documentAuditLoading || undefined}
													aria-label={`Журнал проверки документа: ${documentActionContext}`}
													title={`Журнал проверки документа: ${documentActionContext}`}
													data-testid={`btn-audit-doc-${document.id}`}
												>
													<Shield
														size={14}
														className="text-[var(--primary,#0d9488)] shrink-0"
														aria-hidden="true"
													/>
													<span>
														{documentAuditLoading
															? "Загрузка журнала..."
															: "Журнал проверки документа"}
													</span>
												</button>

												{document.status === "issued" &&
												!document.cryptoSignaturePkcs7 &&
												!document.doctorSignedAt ? (
													<button
														className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--primary,#0d9488)] font-semibold hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
														type="button"
														onClick={() => {
															setOpenDocActionMenuId(null);
															void loadDocumentAuditFacts(document.id);
														}}
														aria-label={`Подписать ЭЦП: ${documentActionContext}`}
														title={`Подписать документ электронной подписью врача: ${documentActionContext}`}
													>
														<FileSignature
															size={14}
															className="text-[var(--primary,#0d9488)] shrink-0"
															aria-hidden="true"
														/>
														<span>Подписать ЭЦП</span>
													</button>
												) : null}

												{documentArchiveAvailable ? (
													<button
														className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
														type="button"
														onClick={() => {
															setOpenDocActionMenuId(null);
															void downloadIssuedDocumentHtml?.(document.id);
														}}
														aria-label={`Скачать HTML документа: ${documentActionContext}`}
														title={`Скачать HTML документа: ${documentActionContext}`}
													>
														<FileCode2
															size={14}
															className="text-slate-500 shrink-0"
															aria-hidden="true"
														/>
														<span>Скачать HTML</span>
													</button>
												) : null}

												{document.status === "draft" ? (
													<button
														className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
														type="button"
														onClick={() => {
															setOpenDocActionMenuId(null);
															void downloadIssuedDocumentPdf(document.id);
														}}
														aria-label={`Печать PDF (Черновик): ${documentActionContext}`}
														title={`Печать PDF (Черновик со штампом): ${documentActionContext}`}
													>
														<Printer
															size={14}
															className="text-slate-500 shrink-0"
															aria-hidden="true"
														/>
														<span>Печать PDF (Черновик)</span>
													</button>
												) : null}

												<button
													className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
													type="button"
													onClick={() => {
														setOpenDocActionMenuId(null);
														if (handleDirectPrintDocumentA4) {
															void handleDirectPrintDocumentA4(
																document.id,
																document.title,
															);
														} else {
															void openIssuedDocumentHtml(document.id);
														}
													}}
													aria-label={`Прямая печать (A4): ${documentActionContext}`}
													title={`Печать документа через системный принтер A4: ${documentActionContext}`}
												>
													<Printer
														size={14}
														className="text-[var(--primary,#0d9488)] shrink-0"
														aria-hidden="true"
													/>
													<span>Прямая печать (A4)</span>
												</button>

												{document.kind === "tax_deduction_certificate" &&
												document.status === "issued" ? (
													<>
														<button
															className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
															type="button"
															onClick={() => {
																setOpenDocActionMenuId(null);
																void downloadTaxDocumentXml?.(document.id);
															}}
															aria-label={`Скачать электронный файл справки для налоговой: ${documentActionContext}`}
															title={`Черновой файл для налоговой: ${documentActionContext}`}
														>
															<FileText
																size={14}
																className="text-[var(--primary,#0d9488)] shrink-0"
																aria-hidden="true"
															/>
															<span>Файл для налоговой</span>
														</button>
														<button
															className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
															type="button"
															onClick={() => {
																setOpenDocActionMenuId(null);
																setIsFnsNdflXmlOpen?.(true);
															}}
															aria-label={`Справка для налогового вычета: ${documentActionContext}`}
															title={`Справка для налогового вычета: ${documentActionContext}`}
														>
															<FileText
																size={14}
																className="text-[var(--primary,#0d9488)] shrink-0"
																aria-hidden="true"
															/>
															<span>Справка для налогового вычета</span>
														</button>
													</>
												) : null}

												{document.kind === "dental_medical_card_043u" ||
												document.kind === "orthodontic_medical_card_043_1u" ||
												document.kind === "medical_record_extract" ? (
													<button
														className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
														type="button"
														onClick={() => {
															setOpenDocActionMenuId(null);
															setIsEgiszRemdOpen?.(true);
														}}
														aria-label={`Отправка в ЕГИСЗ: ${documentActionContext}`}
														title={`Отправка электронного медицинского документа в ЕГИСЗ: ${documentActionContext}`}
													>
														<FileCheck
															size={14}
															className="text-[var(--primary,#0d9488)] shrink-0"
															aria-hidden="true"
														/>
														<span>Отправка в ЕГИСЗ</span>
													</button>
												) : null}

												{document.status !== "voided" ? (
													<button
														className="doc-dropdown-item w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--bad-fg,#ef4444)] hover:bg-[var(--bad-fg,#ef4444)]/10 rounded-lg transition-colors cursor-pointer text-left border-0 bg-transparent min-h-[44px] sm:min-h-[36px]"
														type="button"
														disabled={documentStatusSaving}
														aria-busy={documentStatusSaving || undefined}
														onClick={() => {
															setOpenDocActionMenuId(null);
															requestDocumentVoid(document);
														}}
														aria-label={`Аннулировать документ: ${documentActionContext}`}
														title={`Аннулировать документ: ${documentActionContext}`}
													>
														<X size={14} className="shrink-0" aria-hidden="true" />
														<span>Аннулировать</span>
													</button>
												) : null}
											</div>
										)}
									</div>
								</fieldset>
							</article>
						);
					})}
					{documentsSlice.hasMore && (
						<div className="py-4 text-center bg-[var(--paper-soft)] rounded-xl my-2">
							<button
								type="button"
								className="btn-documents-show-more h-9 px-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
								data-testid="btn-documents-show-more"
								onClick={() => setDisplayLimit((prev) => prev + 40)}
								title="Загрузить следующие документы"
							>
								<span>
									Показать ещё 40 документов (осталось{" "}
									{documentsSlice.remainingCount})
								</span>
							</button>
						</div>
					)}
					{(filteredActiveDocuments ?? []).length === 0 ? (
						(typedActiveDocuments ?? []).length === 0 ? (
							<EmptyState
								title="Нет документов"
								description="Для этого пациента еще не сформировано ни одного документа. Выберите шаблон выше и нажмите «Создать»."
								icon={<FileText size={24} aria-hidden="true" />}
								className="my-4 py-6"
							/>
						) : (
							<EmptyState
								title="Документы не найдены"
								description="По заданным фильтрам и поисковому запросу ничего не найдено. Попробуйте сбросить фильтры поиска."
								icon={<FileText size={24} aria-hidden="true" />}
								className="my-4 py-6"
							/>
						)
					) : null}
				</div>
			</>
		);
	},
);
