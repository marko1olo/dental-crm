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
												className="document-source-badge official-form"
												style={{
													borderColor: "#003399",
													color: "#003399",
													backgroundColor: "rgba(0, 51, 153, 0.08)",
													fontWeight: 600,
												}}
												title={`Подписан УКЭП: ${document.doctorCertSubject || ""}${document.doctorCertSerial ? ` (${document.doctorCertSerial})` : ""}`}
											>
												УКЭП (ГОСТ)
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
									className="document-actions"
									aria-label={`Действия с документом: ${documentActionContext}`}
									style={{
										border: "none",
										padding: 0,
										margin: 0,
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
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
											aria-label={`Проверить и выдать документ: ${documentActionContext}`}
											title={`Проверить и выдать документ: ${documentActionContext}`}
											data-testid={`btn-issue-doc-${document.id}`}
										>
											<FileSignature size={14} className="shrink-0" aria-hidden="true" />
											<span>Проверить и выдать</span>
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
											<Printer size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
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

									<div
										style={{ position: "relative", display: "inline-block" }}
									>
										<button
											className="tactile-doc-btn tactile-doc-btn--icon doc-link document-row-actions-btn min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8"
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
											style={{
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
												padding: "0 6px",
											}}
										>
											<MoreHorizontal size={15} aria-hidden="true" />
										</button>

										{openDocActionMenuId === document.id && (
											<div
												className="document-row-actions-dropdown"
												style={{
													position: "absolute",
													right: 0,
													top: "calc(100% + 4px)",
													zIndex: 50,
													minWidth: "220px",
													boxShadow:
														"var(--shadow-3, 0 10px 25px -5px rgba(0,0,0,0.15))",
													background: "var(--paper, #ffffff)",
													border:
														"1px solid var(--border, var(--line, #cbd5e1))",
													borderRadius: "8px",
													padding: "4px",
													display: "flex",
													flexDirection: "column",
													gap: "2px",
												}}
											>
												<button
													className="doc-dropdown-item"
													type="button"
													onClick={() => {
														setOpenDocActionMenuId(null);
														void loadDocumentAuditFacts(document.id);
													}}
													disabled={documentAuditLoading}
													aria-busy={documentAuditLoading || undefined}
													aria-label={`Открыть паспорт выдачи: ${documentActionContext}`}
													title={`Открыть паспорт выдачи: ${documentActionContext}`}
													style={{
														display: "flex",
														alignItems: "center",
														gap: "8px",
														width: "100%",
														padding: "6px 10px",
														fontSize: "12.5px",
														fontWeight: 500,
														border: "none",
														background: "transparent",
														color: "var(--ink, #0f172a)",
														borderRadius: "4px",
														cursor: "pointer",
														textAlign: "left",
													}}
												>
													<Shield
														size={14}
														className="text-teal-600 dark:text-teal-400 shrink-0"
														aria-hidden="true"
													/>
													<span>
														{documentAuditLoading
															? "Загрузка паспорта..."
															: "Паспорт выдачи"}
													</span>
												</button>

												{document.status === "issued" &&
												!document.cryptoSignaturePkcs7 &&
												!document.doctorSignedAt ? (
													<button
														className="doc-dropdown-item"
														type="button"
														onClick={() => {
															setOpenDocActionMenuId(null);
															void loadDocumentAuditFacts(document.id);
														}}
														aria-label={`Подписать УКЭП (КриптоПро): ${documentActionContext}`}
														title={`Подписать усиленной квалифицированной подписью врача (КриптоПро): ${documentActionContext}`}
														style={{
															display: "flex",
															alignItems: "center",
															gap: "8px",
															width: "100%",
															padding: "6px 10px",
															fontSize: "12.5px",
															fontWeight: 600,
															border: "none",
															background: "transparent",
															color: "var(--teal, #0d9488)",
															borderRadius: "4px",
															cursor: "pointer",
															textAlign: "left",
														}}
													>
														<FileSignature
															size={14}
															className="text-teal-600 dark:text-teal-400 shrink-0"
															aria-hidden="true"
														/>
														<span>Подписать УКЭП (КриптоПро)</span>
													</button>
												) : null}

												{documentArchiveAvailable ? (
													<button
														className="doc-dropdown-item"
														type="button"
														onClick={() => {
															setOpenDocActionMenuId(null);
															void downloadIssuedDocumentHtml?.(document.id);
														}}
														aria-label={`Скачать HTML документа: ${documentActionContext}`}
														title={`Скачать HTML документа: ${documentActionContext}`}
														style={{
															display: "flex",
															alignItems: "center",
															gap: "8px",
															width: "100%",
															padding: "6px 10px",
															fontSize: "12.5px",
															fontWeight: 500,
															border: "none",
															background: "transparent",
															color: "var(--ink, #0f172a)",
															borderRadius: "4px",
															cursor: "pointer",
															textAlign: "left",
														}}
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
														className="doc-dropdown-item"
														type="button"
														onClick={() => {
															setOpenDocActionMenuId(null);
															void downloadIssuedDocumentPdf(document.id);
														}}
														aria-label={`Печать PDF (Черновик): ${documentActionContext}`}
														title={`Печать PDF (Черновик со штампом): ${documentActionContext}`}
														style={{
															display: "flex",
															alignItems: "center",
															gap: "8px",
															width: "100%",
															padding: "6px 10px",
															fontSize: "12.5px",
															fontWeight: 500,
															border: "none",
															background: "transparent",
															color: "var(--ink, #0f172a)",
															borderRadius: "4px",
															cursor: "pointer",
															textAlign: "left",
														}}
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
													className="doc-dropdown-item"
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
													style={{
														display: "flex",
														alignItems: "center",
														gap: "8px",
														width: "100%",
														padding: "6px 10px",
														fontSize: "12.5px",
														fontWeight: 500,
														border: "none",
														background: "transparent",
														color: "var(--ink, #0f172a)",
														borderRadius: "4px",
														cursor: "pointer",
														textAlign: "left",
													}}
												>
													<Printer
														size={14}
														className="text-teal-600 dark:text-teal-400 shrink-0"
														aria-hidden="true"
													/>
													<span>Прямая печать (A4)</span>
												</button>

												{document.kind === "tax_deduction_certificate" &&
												document.status === "issued" ? (
													<>
														<button
															className="doc-dropdown-item"
															type="button"
															onClick={() => {
																setOpenDocActionMenuId(null);
																void downloadTaxDocumentXml?.(document.id);
															}}
															aria-label={`Скачать XML-файл справки НДФЛ: ${documentActionContext}`}
															title={`Черновой файл ФНС: ${documentActionContext}`}
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																width: "100%",
																padding: "6px 10px",
																fontSize: "12.5px",
																fontWeight: 500,
																border: "none",
																background: "transparent",
																color: "var(--ink, #0f172a)",
																borderRadius: "4px",
																cursor: "pointer",
																textAlign: "left",
															}}
														>
															<FileText
																size={14}
																className="text-teal-600 dark:text-teal-400 shrink-0"
																aria-hidden="true"
															/>
															<span>Черновой файл ФНС</span>
														</button>
														<button
															className="doc-dropdown-item"
															type="button"
															onClick={() => {
																setOpenDocActionMenuId(null);
																setIsFnsNdflXmlOpen?.(true);
															}}
															aria-label={`Справка для ФНС (XML): ${documentActionContext}`}
															title={`Справка для ФНС (XML): ${documentActionContext}`}
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																width: "100%",
																padding: "6px 10px",
																fontSize: "12.5px",
																fontWeight: 500,
																border: "none",
																background: "transparent",
																color: "var(--ink, #0f172a)",
																borderRadius: "4px",
																cursor: "pointer",
																textAlign: "left",
															}}
														>
															<FileText
																size={14}
																className="text-teal-600 dark:text-teal-400 shrink-0"
																aria-hidden="true"
															/>
															<span>Справка для ФНС (XML)</span>
														</button>
													</>
												) : null}

												{document.kind === "dental_medical_card_043u" ||
												document.kind === "orthodontic_medical_card_043_1u" ||
												document.kind === "medical_record_extract" ? (
													<button
														className="doc-dropdown-item"
														type="button"
														onClick={() => {
															setOpenDocActionMenuId(null);
															setIsEgiszRemdOpen?.(true);
														}}
														aria-label={`Выгрузка СЭМД в ЕГИСЗ: ${documentActionContext}`}
														title={`Выгрузка СЭМД в ЕГИСЗ: ${documentActionContext}`}
														style={{
															display: "flex",
															alignItems: "center",
															gap: "8px",
															width: "100%",
															padding: "6px 10px",
															fontSize: "12.5px",
															fontWeight: 500,
															border: "none",
															background: "transparent",
															color: "var(--ink, #0f172a)",
															borderRadius: "4px",
															cursor: "pointer",
															textAlign: "left",
														}}
													>
														<FileCheck
															size={14}
															className="text-teal-600 dark:text-teal-400 shrink-0"
															aria-hidden="true"
														/>
														<span>Выгрузка СЭМД в ЕГИСЗ</span>
													</button>
												) : null}

												{document.status !== "voided" ? (
													<button
														className="doc-dropdown-item"
														type="button"
														disabled={documentStatusSaving}
														aria-busy={documentStatusSaving || undefined}
														onClick={() => {
															setOpenDocActionMenuId(null);
															requestDocumentVoid(document);
														}}
														aria-label={`Аннулировать документ: ${documentActionContext}`}
														title={`Аннулировать документ: ${documentActionContext}`}
														style={{
															display: "flex",
															alignItems: "center",
															gap: "8px",
															width: "100%",
															padding: "6px 10px",
															fontSize: "12.5px",
															fontWeight: 500,
															border: "none",
															background: "transparent",
															color: "var(--bad-fg, #ef4444)",
															borderRadius: "4px",
															cursor: "pointer",
															textAlign: "left",
														}}
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
						<div
							style={{
								padding: "16px",
								textAlign: "center",
								background: "var(--paper-strong, #f8fafc)",
								borderRadius: "8px",
								margin: "8px 0",
							}}
						>
							<button
								type="button"
								className="btn-documents-show-more"
								data-testid="btn-documents-show-more"
								onClick={() => setDisplayLimit((prev) => prev + 40)}
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--border, #cbd5e1)",
									color: "var(--ink, #0f172a)",
									padding: "8px 18px",
									borderRadius: "8px",
									fontSize: "13px",
									fontWeight: 600,
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
								}}
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
