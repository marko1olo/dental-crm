import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../../store/appStore";
import {
	Printer,
	Download,
	Copy,
	Check,
	FileText,
	User,
	HeartPulse,
	Activity,
	Calendar,
	Award,
	X,
	ShieldCheck,
	Maximize2,
	Minimize2,
	Sparkles,
	ZoomIn,
	ZoomOut,
	RotateCcw,
	MoreHorizontal,
} from "lucide-react";
import type {
	MedicalCardForm043uData,
	Form043PrintConfig,
} from "./emr043Types";
import {
	validateForm043uCompleteness,
	generatePrintableHtml043,
	generate043XmlCda,
	generate043JsonExport,
	generate043PlainText,
	formatPatientAge,
	calculateDmftIndex,
	calculateCpitnIndex,
} from "./emr043Math";
import {
	DEFAULT_043_DATA,
	resolveClinicRequisites,
	applyForm043PhysiologicalNorm,
} from "./emr043DefaultData";
import {
	Form043PassportTab,
	Form043AnamnesisTab,
	Form043OdontogramTab,
	Form043DiariesTab,
	Form043EpicrisisTab,
} from "./Form043TabSections";
import { EmrProtocolGeneratorModal } from "./protocolGenerator/EmrProtocolGeneratorModal";
import "./emr043Styles.css";

export { DEFAULT_043_DATA } from "./emr043DefaultData";

export interface Form043PrintModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Partial<MedicalCardForm043uData>;
	onSave?: (data: MedicalCardForm043uData) => void;
	readOnly?: boolean;
	onOpenProtocolGenerator?: () => void;
	isLocked?: boolean;
	isDraft?: boolean;
	status?: "draft" | "signed" | "completed" | "voided" | string;
}

export const Form043PrintModal: React.FC<Form043PrintModalProps> = React.memo(
	function Form043PrintModal({
		isOpen,
		onClose,
		initialData,
		onSave,
		readOnly,
		onOpenProtocolGenerator,
		isLocked,
		isDraft,
		status,
	}) {
		const dashboard = useAppStore((s) => s.dashboard);
		const profile = dashboard?.clinicSettings?.profile;
		const staff = dashboard?.clinicSettings?.staff;

		const effectiveIsDraft = Boolean(
			isDraft ||
			isLocked === false ||
			status === "draft" ||
			initialData?.isLocked === false ||
			(initialData as any)?.status === "draft" ||
			!(isLocked || initialData?.isLocked || status === "signed" || (initialData as any)?.status === "signed"),
		);

		const resolvedClinic = useMemo(
			() => resolveClinicRequisites(initialData?.clinic, profile, staff),
			[initialData?.clinic, profile, staff],
		);

		const [formData, setFormData] = useState<MedicalCardForm043uData>(() => {
			return {
				...DEFAULT_043_DATA,
				...initialData,
				clinic: {
					...DEFAULT_043_DATA.clinic,
					...resolvedClinic,
					...(initialData?.clinic || {}),
				},
				passport: { ...DEFAULT_043_DATA.passport, ...(initialData?.passport || {}) },
				anamnesis: { ...DEFAULT_043_DATA.anamnesis, ...(initialData?.anamnesis || {}) },
				dentalStatus: { ...DEFAULT_043_DATA.dentalStatus, ...(initialData?.dentalStatus || {}) },
				epicrisis: { ...DEFAULT_043_DATA.epicrisis, ...(initialData?.epicrisis || {}) },
			};
		});

		const [activeTab, setActiveTab] = useState<Form043PrintConfig["activeTab"]>("overview");
		const [zoomScale, setZoomScale] = useState<number>(1.0);
		const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
		const [copiedToast, setCopiedToast] = useState<boolean>(false);
		const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

		// Состояние генератора клинических протоколов 043/у
		const [isProtocolGeneratorOpen, setIsProtocolGeneratorOpen] = useState<boolean>(false);

		// Валидация полноты формы
		const validation = useMemo(() => {
			return validateForm043uCompleteness(formData);
		}, [formData]);

		// Индексы
		const dmft = useMemo(() => {
			return calculateDmftIndex(formData.dentalStatus.odontogramTeeth);
		}, [formData.dentalStatus.odontogramTeeth]);

		const cpitn = useMemo(() => {
			return calculateCpitnIndex(formData.dentalStatus.cpitnIndex);
		}, [formData.dentalStatus.cpitnIndex]);

		const ageText = useMemo(() => {
			return formatPatientAge(formData.passport.patientBirthDate, formData.passport.cardOpenedDate);
		}, [formData.passport.patientBirthDate, formData.passport.cardOpenedDate]);

		// Обработчик печати
		const handlePrint = useCallback(() => {
			const html = generatePrintableHtml043(formData, {
				scaleRatio: 1.0,
				isLocked: !effectiveIsDraft,
				isDraft: effectiveIsDraft,
				status: effectiveIsDraft ? "draft" : "signed",
			});
			const printFrame = document.createElement("iframe");
			printFrame.style.position = "fixed";
			printFrame.style.right = "0";
			printFrame.style.bottom = "0";
			printFrame.style.width = "0";
			printFrame.style.height = "0";
			printFrame.style.border = "none";
			document.body.appendChild(printFrame);

			const doc = printFrame.contentWindow?.document;
			if (doc) {
				doc.open();
				doc.write(html);
				doc.close();
				printFrame.contentWindow?.focus();
				setTimeout(() => {
					printFrame.contentWindow?.print();
					setTimeout(() => {
						document.body.removeChild(printFrame);
					}, 1500);
				}, 400);
			}
		}, [formData, effectiveIsDraft]);

		// Обработчик экспорта в XML (ЕГИСЗ СЭМД 834н)
		const handleExportXml = useCallback(() => {
			const xml = generate043XmlCda(formData);
			const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `Form043u_${formData.passport.medicalCardNumber}_EGISZ.xml`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}, [formData]);

		// Обработчик экспорта в JSON
		const handleExportJson = useCallback(() => {
			const json = generate043JsonExport(formData);
			const blob = new Blob([json], { type: "application/json;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `Form043u_${formData.passport.medicalCardNumber}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}, [formData]);

		// Копирование текста в буфер
		const handleCopyText = useCallback(() => {
			const text = generate043PlainText(formData);
			navigator.clipboard
				.writeText(text)
				.then(() => {
					setCopiedToast(true);
					setTimeout(() => setCopiedToast(false), 2500);
				})
				.catch(() => {});
		}, [formData]);

		// Мандат 8e: Заполнение незаполненных полей анамнеза и статуса физиологической нормой в 1 клик
		const handleApplyNorm043 = useCallback(() => {
			setFormData((prev) => {
				const updated = applyForm043PhysiologicalNorm(prev);
				onSave?.(updated);
				return updated;
			});
		}, [onSave]);

		// Ручное сохранение карты (Мандат 8e)
		const handleSaveForm = useCallback(() => {
			onSave?.(formData);
		}, [onSave, formData]);

		const moreMenuRef = useRef<HTMLDivElement>(null);
		useEffect(() => {
			if (!isMoreMenuOpen) return;
			const handleClickOutside = (event: MouseEvent) => {
				if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
					setIsMoreMenuOpen(false);
				}
			};
			const handleKeyDown = (event: KeyboardEvent) => {
				if (event.key === "Escape") {
					setIsMoreMenuOpen(false);
				}
			};
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
				document.removeEventListener("keydown", handleKeyDown);
			};
		}, [isMoreMenuOpen]);

		if (!isOpen) return null;

		// Anti-Matryoshka (Sin 6, Mandate 8d): Render child modals sequentially (depth strictly 1).
		if (isProtocolGeneratorOpen) {
			return (
				<EmrProtocolGeneratorModal
					isOpen={true}
					onClose={() => setIsProtocolGeneratorOpen(false)}
					patientFullName={formData.passport.patientFullName}
					patientBirthDate={formData.passport.patientBirthDate}
					medicalCardNumber={formData.passport.medicalCardNumber}
					doctorFullName={formData.passport.attendingDoctorFullName}
					doctorSpecialty={formData.passport.attendingDoctorSpecialty}
					odontogramTeeth={formData.dentalStatus.odontogramTeeth}
					onApplyDiary={(newDiary) => {
						setFormData((prev) => {
							const updated = {
								...prev,
								visitDiaries: [newDiary, ...prev.visitDiaries],
							};
							onSave?.(updated);
							return updated;
						});
						setIsProtocolGeneratorOpen(false);
					}}
					onApplyBatchDiaries={(newDiaries) => {
						setFormData((prev) => {
							const updated = {
								...prev,
								visitDiaries: [...newDiaries, ...prev.visitDiaries],
							};
							onSave?.(updated);
							return updated;
						});
						setIsProtocolGeneratorOpen(false);
					}}
				/>
			);
		}

		return (
			<div className="emr043-modal-backdrop" role="dialog" aria-modal="true">
				<div
					className="emr043-modal-window"
					style={{
						maxWidth: isFullscreen ? "100%" : "1240px",
						height: isFullscreen ? "98vh" : "94vh",
					}}
				>
					{/* ── Верхний тулбар действий ── */}
					<header className="emr043-header-toolbar">
						<div className="emr043-header-title-group">
							<span className="emr043-header-badge">
								<FileText className="w-3.5 h-3.5" />
								Медицинская карта пациента
							</span>
							{effectiveIsDraft ? (
								<span
									data-testid="badge-043-draft-status"
									className="px-2.5 py-0.5 rounded border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1"
								>
									<FileText className="w-3 h-3 text-amber-600" />
									ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)
								</span>
							) : (
								<span
									data-testid="badge-043-draft-status"
									className="px-2.5 py-0.5 rounded border border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1"
								>
									<Check className="w-3 h-3 text-emerald-600" />
									ПОДПИСАНО ВРАЧОМ
								</span>
							)}
							<div>
								<h2 className="emr043-header-title">
									Медицинская карта № {formData.passport.medicalCardNumber}
								</h2>
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
									Пациент: <strong>{formData.passport.patientFullName}</strong> ({ageText}) • Врач: <strong>{formData.passport.attendingDoctorFullName}</strong>
								</div>
							</div>
						</div>

						<div className="emr043-header-actions">
							{/* Управление масштабом A4 листа (Мандат 8d) */}
							{activeTab === "overview" && (
								<div
									className="emr043-zoom-toolbar"
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "3px",
										border: "1px solid var(--glass-border, #cbd5e1)",
										borderRadius: "6px",
										padding: "2px 6px",
										background: "var(--paper, #f8fafc)",
										height: "32px",
									}}
									title="Масштаб предварительного просмотра листа карты"
								>
									<button
										type="button"
										onClick={() => setZoomScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(1))))}
										disabled={zoomScale <= 0.5}
										title="Уменьшить масштаб (–10%)"
										style={{
											background: "transparent",
											border: "none",
											cursor: zoomScale <= 0.5 ? "not-allowed" : "pointer",
											display: "inline-flex",
											alignItems: "center",
											padding: "2px",
											color: "var(--ink, #0f172a)",
											opacity: zoomScale <= 0.5 ? 0.35 : 1,
										}}
										aria-label="Уменьшить масштаб"
									>
										<ZoomOut className="w-3.5 h-3.5" />
									</button>
									<span
										style={{
											fontSize: "11px",
											fontWeight: 700,
											fontVariantNumeric: "tabular-nums",
											minWidth: "36px",
											textAlign: "center",
											color: "var(--ink, #0f172a)",
											userSelect: "none",
										}}
									>
										{Math.round(zoomScale * 100)}%
									</span>
									<button
										type="button"
										onClick={() => setZoomScale((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(1))))}
										disabled={zoomScale >= 1.5}
										title="Увеличить масштаб (+10%)"
										style={{
											background: "transparent",
											border: "none",
											cursor: zoomScale >= 1.5 ? "not-allowed" : "pointer",
											display: "inline-flex",
											alignItems: "center",
											padding: "2px",
											color: "var(--ink, #0f172a)",
											opacity: zoomScale >= 1.5 ? 0.35 : 1,
										}}
										aria-label="Увеличить масштаб"
									>
										<ZoomIn className="w-3.5 h-3.5" />
									</button>
									{zoomScale !== 1.0 && (
										<button
											type="button"
											onClick={() => setZoomScale(1.0)}
											title="Сбросить масштаб к 100%"
											style={{
												background: "transparent",
												border: "none",
												cursor: "pointer",
												display: "inline-flex",
												alignItems: "center",
												padding: "2px",
												color: "var(--muted, #64748b)",
											}}
											aria-label="Сбросить масштаб"
										>
											<RotateCcw className="w-3 h-3" />
										</button>
									)}
								</div>
							)}

							{/* Кнопка нормы в 1 клик (Мандат 8e: 0 disabled) */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary"
								onClick={handleApplyNorm043}
								disabled={false}
								data-testid="btn-form043-apply-norm"
								title="Заполнить незаполненные поля анамнеза и статуса физиологической нормой"
							>
								<Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
								<span>Норма</span>
							</button>

							{/* Кнопка сохранения карты при наличии onSave (Мандат 8e: 0 disabled) */}
							{onSave && (
								<button
									type="button"
									className="emr043-btn emr043-btn-secondary"
									onClick={handleSaveForm}
									disabled={false}
									data-testid="btn-form043-save-card"
									title="Сохранить изменения медицинской карты"
								>
									<Check className="w-4 h-4 text-emerald-600 shrink-0" />
									<span>Сохранить</span>
								</button>
							)}

							{/* Кнопка печати (Мандат 8e: печать в любой момент, 0 disabled) */}
							<button
								type="button"
								className="emr043-btn emr043-btn-primary"
								onClick={handlePrint}
								disabled={false}
								data-testid="btn-print-043-card"
								title="Печать или экспорт в PDF (A4)"
							>
								<Printer className="w-4 h-4" />
								<span>Печать / PDF (A4)</span>
							</button>

							{/* Вторичные действия: ЕГИСЗ XML, JSON, Копирование (Закон Миллера, Мандат 8d) */}
							<div className="relative inline-flex items-center" ref={moreMenuRef}>
								<button
									type="button"
									className="emr043-btn emr043-btn-secondary emr043-btn-icon-only"
									onClick={() => setIsMoreMenuOpen((v) => !v)}
									title="Дополнительные форматы (электронная медкарта, JSON, буфер)"
									aria-label="Дополнительные форматы экспорта"
									data-testid="btn-043-more-actions"
								>
									<MoreHorizontal className="w-4 h-4" />
								</button>
								{isMoreMenuOpen && (
									<div
										className="absolute right-0 top-full mt-1 w-56 bg-[var(--paper-strong,#ffffff)] dark:bg-slate-900 border border-[var(--glass-border,#cbd5e1)] dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 text-xs text-[var(--ink,#0f172a)] dark:text-slate-100 animate-in fade-in duration-100"
										style={{ minWidth: "210px" }}
									>
										<button
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
											onClick={() => {
												handleApplyNorm043();
												setIsMoreMenuOpen(false);
											}}
											data-testid="btn-043-more-apply-norm"
											title="Заполнить незаполненные поля анамнеза и статуса физиологической нормой"
										>
											<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
											<span>Физиологическая норма</span>
										</button>
										{onSave && (
											<button
												type="button"
												className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
												onClick={() => {
													handleSaveForm();
													setIsMoreMenuOpen(false);
												}}
												data-testid="btn-043-more-save"
												title="Сохранить медицинскую карту"
											>
												<Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
												<span>Сохранить карту</span>
											</button>
										)}
										<button
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
											onClick={() => {
												handleExportXml();
												setIsMoreMenuOpen(false);
											}}
											title="Экспорт в XML для электронной медкарты (Госуслуги)"
										>
											<Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
											<span>Электронная медкарта (XML)</span>
										</button>
										<button
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
											onClick={() => {
												handleExportJson();
												setIsMoreMenuOpen(false);
											}}
											title="Экспорт в структурированный JSON"
										>
											<Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
											<span>Экспорт в JSON</span>
										</button>
										<button
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
											onClick={() => {
												handleCopyText();
												setIsMoreMenuOpen(false);
											}}
											title="Копировать структурированный текст карты"
										>
											{copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />}
											<span>{copiedToast ? "Скопировано!" : "Копировать текст карты"}</span>
										</button>
									</div>
								)}
							</div>

							{/* Полноэкранный режим */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary emr043-btn-icon-only"
								onClick={() => setIsFullscreen(!isFullscreen)}
								title={isFullscreen ? "Свернуть" : "На весь экран"}
							>
								{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
							</button>

							{/* Закрыть */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary emr043-btn-icon-only"
								onClick={onClose}
								title="Закрыть окно"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</header>

					{/* ── Навигационные вкладки ── */}
					<nav className="emr043-nav-tabs" style={{ flexWrap: "nowrap", width: "100%", padding: "4px 16px", gap: "6px", overflowX: "auto" }}>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "overview" ? "active" : ""}`}
							onClick={() => setActiveTab("overview")}
						>
							<FileText className="w-3.5 h-3.5 shrink-0" />
							<span>Обзор и печать A4</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "passport" ? "active" : ""}`}
							onClick={() => setActiveTab("passport")}
						>
							<User className="w-3.5 h-3.5 shrink-0" />
							<span>1. Паспортная часть</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "anamnesis" ? "active" : ""}`}
							onClick={() => setActiveTab("anamnesis")}
						>
							<HeartPulse className="w-3.5 h-3.5 shrink-0" />
							<span>2. Анамнез и соматика</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "odontogram" ? "active" : ""}`}
							onClick={() => setActiveTab("odontogram")}
						>
							<Activity className="w-3.5 h-3.5 shrink-0" />
							<span>3. Зубная формула и индексы</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "diaries" ? "active" : ""}`}
							onClick={() => setActiveTab("diaries")}
						>
							<Calendar className="w-3.5 h-3.5 shrink-0" />
							<span>4. Дневники визитов</span>
							<span style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.8 }}>({formData.visitDiaries.length})</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "epicrisis" ? "active" : ""}`}
							onClick={() => setActiveTab("epicrisis")}
						>
							<Award className="w-3.5 h-3.5 shrink-0" />
							<span>5. Эпикриз и контрольное наблюдение</span>
						</button>
					</nav>

					{/* ── Индикатор полноты данных карты ── */}
					<div className="emr043-completeness-bar emr043-non-printable">
						<ShieldCheck className={`w-5 h-5 ${validation.isComplete ? "text-emerald-600" : "text-amber-500"}`} />
						<div style={{ fontSize: "12px", fontWeight: 600 }}>
							Заполненность карты: <strong>{validation.completenessScore}%</strong>
						</div>
						<div className="emr043-progress-track">
							<div
								className={`emr043-progress-fill ${
									validation.completenessScore >= 90 ? "green" : validation.completenessScore >= 60 ? "yellow" : "red"
								}`}
								style={{ width: `${validation.completenessScore}%` }}
							/>
						</div>
						{validation.missingFields.length > 0 && (
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
								<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
									Не заполнено: {validation.missingFields.map((m) => m.label).join(", ")}
								</span>
								<button
									type="button"
									onClick={handleApplyNorm043}
									disabled={false}
									data-testid="btn-043-completeness-norm"
									style={{
										fontSize: "11px",
										color: "var(--teal, #0d9488)",
										background: "transparent",
										border: "none",
										textDecoration: "underline",
										cursor: "pointer",
										fontWeight: 600,
										padding: 0,
									}}
									title="Заполнить незаполненные показатели физиологической нормой"
								>
									Заполнить нормой
								</button>
							</div>
						)}
					</div>

					{/* ── Основное содержимое вкладки ── */}
					<main className="emr043-body">
						{/* Вкладка 1: Обзор и интерактивный лист А4 */}
						{activeTab === "overview" && (
							<div className="emr043-preview-container" style={{ flexDirection: "column", alignItems: "center" }}>
								<div
									className="emr043-a4-sheet"
									style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
									dangerouslySetInnerHTML={{
										__html: generatePrintableHtml043(formData, {
											isLocked: !effectiveIsDraft,
											isDraft: effectiveIsDraft,
											status: effectiveIsDraft ? "draft" : "signed",
										}),
									}}
								/>
							</div>
						)}

						{/* Вкладка 2: Паспортная часть */}
						{activeTab === "passport" && (
							<Form043PassportTab formData={formData} ageText={ageText} />
						)}

						{/* Вкладка 3: Анамнез */}
						{activeTab === "anamnesis" && (
							<Form043AnamnesisTab formData={formData} onApplyNorm={handleApplyNorm043} />
						)}

						{/* Вкладка 4: Зубная формула и индексы */}
						{activeTab === "odontogram" && (
							<Form043OdontogramTab
								formData={formData}
								dmft={dmft}
								cpitn={cpitn}
								onApplyNorm={handleApplyNorm043}
							/>
						)}

						{/* Вкладка 5: Дневники визитов (Форма 043/у) */}
						{activeTab === "diaries" && (
							<Form043DiariesTab
								formData={formData}
								onOpenProtocolGenerator={onOpenProtocolGenerator}
								onOpenInternalProtocolGenerator={() => setIsProtocolGeneratorOpen(true)}
							/>
						)}

						{/* Вкладка 6: Эпикриз и контрольное наблюдение */}
						{activeTab === "epicrisis" && (
							<Form043EpicrisisTab formData={formData} />
						)}
					</main>
				</div>
			</div>
		);
	},
);
