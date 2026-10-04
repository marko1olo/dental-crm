import { FileText, Layers, Package, Sparkles } from "lucide-react";
import React, { useMemo } from "react";
import {
	type ConsentPackage,
	type ConsentPackageKey,
	type ConsentSubstitutionContext,
	type ConsentTemplate,
	type ConsentTemplateKey,
	PACKAGE_SHORT_TITLES,
	TEMPLATE_SHORT_TITLES,
} from "./consentTemplates.js";
import {
	sanitizeConsentFieldValue,
	sanitizeConsentContext,
} from "./consentSummaryHelper.js";

export interface ConsentToolbarAndBannerProps {
	activeMode: "packages" | "single";
	setActiveMode: (mode: "packages" | "single") => void;
	activePackageKey: ConsentPackageKey;
	setActivePackageKey: (key: ConsentPackageKey) => void;
	activeKey: ConsentTemplateKey;
	setActiveKey: (key: ConsentTemplateKey) => void;
	activeDocKey: ConsentTemplateKey;
	setPreviewTemplateKey: (key: ConsentTemplateKey | null) => void;
	allPackages: ConsentPackage[];
	allTemplates: ConsentTemplate[];
	currentPackage: ConsentPackage;
	getConsentTemplate: (key: ConsentTemplateKey) => ConsentTemplate;
	substitutionContext: ConsentSubstitutionContext;
}

export const ConsentToolbarAndBanner: React.FC<ConsentToolbarAndBannerProps> = ({
	activeMode,
	setActiveMode,
	activePackageKey,
	setActivePackageKey,
	activeKey,
	setActiveKey,
	activeDocKey,
	setPreviewTemplateKey,
	allPackages,
	allTemplates,
	currentPackage,
	getConsentTemplate,
	substitutionContext,
}) => {
	const cleanContext = useMemo(() => sanitizeConsentContext(substitutionContext), [substitutionContext]);

	const cleanTeethList = useMemo(() => {
		const raw = cleanContext.toothNumbers || "";
		if (!raw || raw === "Полость рта (зубной ряд)" || raw === "Полость рта") return [];
		return raw.split(/[,;\s]+/).filter(Boolean);
	}, [cleanContext.toothNumbers]);

	return (
		<>
			{/* Панель выбора режима и вкладок (1 строка 32-36px на ПК, адаптивный скролл на мобиле) */}
			<div className="consent-toolbar-row">
				<div className="consent-mode-segmented">
					<button
						type="button"
						className={`consent-mode-btn ${activeMode === "packages" ? "active" : ""}`}
						onClick={() => {
							setActiveMode("packages");
							setPreviewTemplateKey(null);
						}}
						data-testid="tab-mode-packages"
						aria-pressed={activeMode === "packages"}
						style={{ height: "24px", padding: "0 8px", fontSize: "12px" }}
					>
						<Layers size={13} />
						<span>Пакеты согласий (1 клик)</span>
					</button>
					<button
						type="button"
						className={`consent-mode-btn ${activeMode === "single" ? "active" : ""}`}
						onClick={() => setActiveMode("single")}
						data-testid="tab-mode-single"
						aria-pressed={activeMode === "single"}
						style={{ height: "24px", padding: "0 8px", fontSize: "12px" }}
					>
						<FileText size={13} />
						<span>Отдельные согласия</span>
					</button>
				</div>

				<nav
					className="consent-tabs-scroll min-w-0"
					aria-label={activeMode === "packages" ? "Пакеты согласий" : "Шаблоны согласий"}
				>
					{activeMode === "packages"
						? allPackages.map((pkg) => {
								const isActive = pkg.key === activePackageKey;
								const titleText = PACKAGE_SHORT_TITLES[pkg.key] || pkg.title;
								return (
									<button
										key={pkg.key}
										type="button"
										className={`consent-tab-btn shrink-0 flex-shrink-0 min-w-0 ${isActive ? "active" : ""}`}
										style={{
											minHeight: "26px",
											height: "26px",
											padding: "0 8px",
											fontSize: "12px",
											borderRadius: "6px",
										}}
										onClick={() => {
											setActivePackageKey(pkg.key);
											setPreviewTemplateKey(null);
										}}
										aria-selected={isActive}
										data-testid={`pkg-tab-${pkg.key}`}
										title={titleText}
									>
										<Sparkles size={13} className="shrink-0" />
										<span className="truncate max-w-[200px]">{titleText}</span>
									</button>
								);
						  })
						: allTemplates.map((tpl) => {
								const isActive = tpl.key === activeKey;
								const titleText = TEMPLATE_SHORT_TITLES[tpl.key] || tpl.title;
								return (
									<button
										key={tpl.key}
										type="button"
										className={`consent-tab-btn shrink-0 flex-shrink-0 min-w-0 ${isActive ? "active" : ""}`}
										style={{
											minHeight: "26px",
											height: "26px",
											padding: "0 8px",
											fontSize: "12px",
											borderRadius: "6px",
										}}
										onClick={() => setActiveKey(tpl.key)}
										aria-selected={isActive}
										data-testid={`tpl-tab-${tpl.key}`}
										title={titleText}
									>
										<span className="truncate max-w-[200px]">{titleText}</span>
									</button>
								);
						  })}
				</nav>
			</div>

			{/* Баннер активного пакета с чипами быстрого предпросмотра документов */}
			{activeMode === "packages" && (
				<div className="consent-package-banner">
					<div className="consent-package-banner-title min-w-0 flex-1">
						<Package size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div className="min-w-0 flex-1">
							<div className="font-bold text-sm text-[var(--teal-dark,#0f766e)] truncate">
								{currentPackage.title} ({currentPackage.templateKeys.length} документа в пакете)
							</div>
							<div className="text-xs text-muted truncate">
								{currentPackage.description} • 1 клик подтверждает подписание всех {currentPackage.templateKeys.length} документов на бумаге
							</div>
						</div>
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-xs font-semibold text-muted mr-1">Просмотр бланка:</span>
						{currentPackage.templateKeys.map((k) => {
							const t = getConsentTemplate(k);
							const isSelected = k === activeDocKey;
							return (
								<button
									key={k}
									type="button"
									className={`consent-subdoc-chip min-w-0 ${isSelected ? "active" : ""}`}
									onClick={() => setPreviewTemplateKey(k)}
									title={`Просмотреть ${t.title}`}
								>
									<span className="font-mono shrink-0">{t.code}</span>
									<span className="truncate max-w-[180px]">{TEMPLATE_SHORT_TITLES[k] || t.title}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Информационная панель метаданных (полная чистота от системного мусора) */}
			<div className="consent-meta-grid">
				<div className="consent-meta-item min-w-0">
					<span className="consent-meta-label">Пациент</span>
					<span
						className="consent-meta-value truncate"
						title={cleanContext.patientName || "Бланк для ручного заполнения («________»)"}
					>
						{cleanContext.patientName || <em style={{ color: "var(--muted, #64748b)" }}>Бланк («________»)</em>}
					</span>
					{cleanContext.birthDate && (
						<span className="consent-meta-label truncate">Д.Р.: {cleanContext.birthDate}</span>
					)}
				</div>

				<div className="consent-meta-item min-w-0">
					<span className="consent-meta-label">Лечащий врач</span>
					<span
						className="consent-meta-value truncate"
						title={cleanContext.doctorName || "Врач не назначен"}
					>
						{cleanContext.doctorName || <em style={{ color: "var(--muted, #64748b)" }}>Не назначен</em>}
					</span>
				</div>

				<div className="consent-meta-item min-w-0">
					<span className="consent-meta-label">Диагноз (МКБ-10)</span>
					<span
						className="consent-meta-value truncate"
						title={cleanContext.diagnosisIcd || "Первичный осмотр"}
					>
						{cleanContext.diagnosisIcd || <em style={{ color: "var(--muted, #64748b)" }}>Не указан</em>}
					</span>
				</div>

				<div className="consent-meta-item min-w-0">
					<span className="consent-meta-label">Зубы / Зона</span>
					<span
						className="consent-meta-value truncate"
						title={cleanContext.toothNumbers || "Полость рта"}
					>
						{cleanContext.toothNumbers || <span style={{ color: "var(--muted, #64748b)" }}>Полость рта</span>}
					</span>
					{cleanTeethList.length > 0 && (
						<div
							className="consent-teeth-badges"
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "3px",
								maxHeight: "56px",
								overflowY: "auto",
							}}
						>
							{cleanTeethList.map((t) => (
								<span key={t} className="consent-tooth-chip">
									{t}
								</span>
							))}
						</div>
					)}
				</div>
			</div>
		</>
	);
};
