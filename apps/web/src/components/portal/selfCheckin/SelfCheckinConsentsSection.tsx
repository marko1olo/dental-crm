/**
 * SelfCheckinConsentsSection.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Renders statutory consents signing step:
 * - 1-Click Simple Electronic Signature (PEP 63-ФЗ) for all consents
 * - Individual tabbed consent review (323-ФЗ ст. 20, 152-ФЗ)
 * - Paper signing option on reception desk
 * - Vector touch signature preview
 */

import React, { memo } from "react";
import { ArrowRight, Check, CheckCircle2, FileSignature, ShieldCheck } from "lucide-react";
import { SelfCheckinSignatureCanvas } from "./SelfCheckinSignatureCanvas";

export interface StatutoryConsentItem {
	id: string;
	code: string;
	titleRu: string;
	categoryRu: string;
	statutoryBasis: string;
	summaryRu: string;
	fullTextRu: string;
	isSigned: boolean;
	signatureSvg?: string | undefined;
	signedAtIso?: string | undefined;
}

export const DEFAULT_CONSENTS: StatutoryConsentItem[] = [
	{
		id: "ids_treatment",
		code: "Лечение",
		titleRu: "Информированное согласие на стоматологическое лечение",
		categoryRu: "Терапия и диагностика",
		statutoryBasis: "Стандарты медпомощи",
		summaryRu:
			"Согласие на проведение клинического осмотра, инструментальной диагностики, препарирования полостей и постановки реставраций.",
		fullTextRu:
			"Я, пациент клиники, даю информированное добровольное согласие на виды медицинских вмешательств в соответствии со стандартами охраны здоровья граждан. Мне разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинского вмешательства, его последствия, а также предполагаемые результаты.",
		isSigned: false,
	},
	{
		id: "ids_anesthesia",
		code: "Обезболивание",
		titleRu: "Информированное согласие на местное обезболивание",
		categoryRu: "Анестезия",
		statutoryBasis: "Безопасность анестезии",
		summaryRu:
			"Согласие на инфильтрационную и проводниковую анестезию современными карпульными препаратами (Артикаин, Мепивакаин).",
		fullTextRu:
			"Я подтверждаю, что сообщил врачу полные и достоверные сведения о перенесенных заболеваниях, наличии аллергических реакций на медикаменты, заболеваниях сердца, сосудов, свертываемости крови и принимаемых препаратах. Согласен на проведение местного обезболивания.",
		isSigned: false,
	},
	{
		id: "pd_152",
		code: "Персональные данные",
		titleRu: "Согласие на обработку персональных данных",
		categoryRu: "Персональные данные",
		statutoryBasis: "Конфиденциальность данных",
		summaryRu:
			"Согласие на сбор, хранение и обработку персональных данных и сведений, составляющих врачебную тайну, в рамках оказания медпомощи.",
		fullTextRu:
			"Подтверждаю свое согласие на обработку клиникой моих персональных данных и медицинских сведений в целях ведения электронной медицинской карты и оказания стоматологических услуг с соблюдением врачебной тайны.",
		isSigned: false,
	},
];

export interface SelfCheckinConsentsSectionProps {
	readonly consents: readonly StatutoryConsentItem[];
	readonly activeConsentIndex: number;
	readonly signerPhone?: string | undefined;
	readonly onSelectConsentIndex: (idx: number) => void;
	readonly onSignAllConsentsWithPep: () => void;
	readonly onSignCurrentConsent: (signatureSvgCustom?: string | undefined) => void;
	readonly onSignCurrentConsentWithPaper: () => void;
	readonly consentNotice: string | null;
	readonly allConsentsSigned: boolean;
	readonly onProceedToSomatic: () => void;
}

export const SelfCheckinConsentsSection: React.FC<SelfCheckinConsentsSectionProps> = memo(({
	consents,
	activeConsentIndex,
	signerPhone,
	onSelectConsentIndex,
	onSignAllConsentsWithPep,
	onSignCurrentConsent,
	onSignCurrentConsentWithPaper,
	consentNotice,
	allConsentsSigned,
	onProceedToSomatic,
}) => {
	const [signMode, setSignMode] = React.useState<"pep" | "canvas">("canvas");
	const currentConsent = consents[activeConsentIndex];
	if (!currentConsent) return null;

	return (
		<div className="selfcheckin-step-box">
			<div className="selfcheckin-consents-quick-bar">
				<button
					type="button"
					className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
					onClick={onSignAllConsentsWithPep}
					title="Подписать все согласия онлайн"
					data-testid="sign-all-consents-pep-btn"
				>
					<ShieldCheck size={16} />
					<span>Подписать все согласия онлайн</span>
				</button>
			</div>

			<div className="selfcheckin-consent-nav">
				{consents.map((item, idx) => (
					<button
						key={item.id}
						type="button"
						className={`selfcheckin-consent-tab ${
							idx === activeConsentIndex ? "active" : ""
						} ${item.isSigned ? "signed" : ""}`}
						onClick={() => onSelectConsentIndex(idx)}
					>
						{item.isSigned && <Check size={12} className="inline mr-1" />}
						{item.code}
					</button>
				))}
			</div>

			<div className="selfcheckin-consent-card">
				<div className="selfcheckin-consent-header">
					<span className="selfcheckin-consent-badge">
						{currentConsent.categoryRu} • {currentConsent.statutoryBasis}
					</span>
					<h3 className="selfcheckin-consent-title">
						{currentConsent.titleRu}
					</h3>
				</div>

				<div className="selfcheckin-consent-text-box">
					<p className="selfcheckin-consent-summary">
						<strong>Суть документа:</strong> {currentConsent.summaryRu}
					</p>
					<p className="selfcheckin-consent-fulltext">
						{currentConsent.fullTextRu}
					</p>
				</div>

				{/* Signature Area */}
				{currentConsent.isSigned ? (
					<div className="selfcheckin-signed-badge-box">
						<div className="selfcheckin-signed-success flex items-center justify-center gap-1.5">
							<CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
							<span>Документ подтвержден и подписан</span>
						</div>
						<div className="selfcheckin-signed-meta">
							Время:{" "}
							{currentConsent.signedAtIso
								?.slice(0, 19)
								.replace("T", " ")}{" "}
							UTC
						</div>
						{currentConsent.signatureSvg && (
							<div
								className="selfcheckin-signed-preview"
								dangerouslySetInnerHTML={{
									__html: currentConsent.signatureSvg,
								}}
							/>
						)}
					</div>
				) : (
					<div className="selfcheckin-signature-block">
						{/* Mode Switcher: Finger Drawing on Screen vs 1-Click PEP vs Reception Paper */}
						<div
							style={{
								display: "flex",
								gap: "6px",
								padding: "3px",
								borderRadius: "10px",
								backgroundColor: "var(--paper-soft, var(--paper))",
								border: "1px solid var(--line)",
								marginBottom: "8px",
							}}
						>
							<button
								type="button"
								onClick={() => setSignMode("canvas")}
								data-testid="consent-mode-canvas-btn"
								style={{
									flex: 1,
									minHeight: "48px",
									padding: "8px 12px",
									borderRadius: "10px",
									fontSize: "13px",
									fontWeight: signMode === "canvas" ? 700 : 500,
									border: "none",
									backgroundColor: signMode === "canvas" ? "var(--teal)" : "transparent",
									color: signMode === "canvas" ? "var(--on-teal, #ffffff)" : "var(--muted)",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									transition: "all 0.15s ease",
								}}
							>
								<FileSignature size={16} />
								<span>Роспись пальцем</span>
							</button>

							<button
								type="button"
								onClick={() => setSignMode("pep")}
								data-testid="consent-mode-pep-btn"
								style={{
									flex: 1,
									minHeight: "48px",
									padding: "8px 12px",
									borderRadius: "10px",
									fontSize: "13px",
									fontWeight: signMode === "pep" ? 700 : 500,
									border: "none",
									backgroundColor: signMode === "pep" ? "var(--teal)" : "transparent",
									color: signMode === "pep" ? "var(--on-teal, #ffffff)" : "var(--muted)",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									transition: "all 0.15s ease",
								}}
							>
								<ShieldCheck size={16} />
								<span>ПЭП онлайн</span>
							</button>
						</div>

						{signMode === "canvas" ? (
							<SelfCheckinSignatureCanvas
								consentTitle={currentConsent.titleRu}
								signerPhone={signerPhone}
								onConfirmSignature={(svg) => onSignCurrentConsent(svg)}
							/>
						) : (
							<div className="flex flex-col gap-2 mt-2">
								<div className="selfcheckin-legal-pep-badge">
									<ShieldCheck size={16} />
									<span>Простая электронная подпись (ПЭП)</span>
								</div>
								<button
									type="button"
									className="selfcheckin-btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
									onClick={() => onSignCurrentConsent()}
									data-testid="consent-sign-pep-single-btn"
								>
									<ShieldCheck size={18} />
									<span>Подтвердить согласие (ПЭП)</span>
								</button>
							</div>
						)}

						<button
							type="button"
							className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline flex items-center justify-center gap-1.5 cursor-pointer mt-2"
							onClick={onSignCurrentConsentWithPaper}
							data-testid="consent-sign-paper-desk-btn"
						>
							<span>Оформить на бумаге на стойке регистрации</span>
						</button>

						{consentNotice && (
							<div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium mt-2">
								{consentNotice}
							</div>
						)}
					</div>
				)}
			</div>

			{allConsentsSigned && (
				<button
					type="button"
					className="selfcheckin-btn-accent"
					onClick={onProceedToSomatic}
				>
					<span className="flex items-center justify-center gap-1.5">
						<span>Перейти к анкете здоровья</span>
						<ArrowRight size={16} />
					</span>
				</button>
			)}
		</div>
	);
});

SelfCheckinConsentsSection.displayName = "SelfCheckinConsentsSection";
