/**
 * InformedConsentViewer.tsx
 *
 * Канонический компонент просмотра, проверки и печати
 * Информированного добровольного согласия (ИДС) по Приказу Минздрава РФ № 1051н
 * и ст. 20 Федерального закона № 323-ФЗ.
 *
 * Мандат 8e: Заполнение нормы, печать в любой момент со штампом «ЧЕРНОВИК» или «ПОДПИСАНО».
 * Никаких эмодзи, только векторные иконки Lucide.
 */

import React, { useMemo, useState } from "react";
import {
	X,
	Printer,
	Download,
	FileText,
	ShieldCheck,
	CheckCircle2,
	AlertCircle,
	Sparkles,
} from "lucide-react";
import type { Patient } from "@dental/shared";
import { useDocumentStore } from "../../store/documentStore";

export interface InformedConsentViewerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly interventionName?: string;
	readonly toothOrArea?: string;
	readonly diagnosis?: string;
	readonly isSigned?: boolean;
	readonly onPrint?: () => void;
	readonly onDownloadPdf?: () => void;
	readonly onConfirmSigned?: () => void;
}

export const InformedConsentViewer: React.FC<InformedConsentViewerProps> = ({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	clinicProfileDraft,
	interventionName = "Стоматологический осмотр, диагностика и терапевтическое лечение",
	toothOrArea = "Полость рта",
	diagnosis = "Кариес дентина (K02.1)",
	isSigned = false,
	onPrint,
	onDownloadPdf,
	onConfirmSigned,
}) => {
	const [questionsAnswered, setQuestionsAnswered] = useState(true);
	const [risksUnderstood, setRisksUnderstood] = useState(true);
	const [withdrawUnderstood, setWithdrawUnderstood] = useState(true);
	const [isPrinting, setIsPrinting] = useState(false);

	const store = useDocumentStore();

	const todayRu = useMemo(() => {
		const d = new Date();
		const day = String(d.getDate()).padStart(2, "0");
		const months = [
			"января", "февраля", "марта", "апреля", "мая", "июня",
			"июля", "августа", "сентября", "октября", "ноября", "декабря",
		];
		const month = months[d.getMonth()] || "января";
		const year = d.getFullYear();
		return `${day} ${month} ${year}`;
	}, []);

	const clinicName =
		clinicProfileDraft?.legalName ||
		clinicProfileDraft?.clinicName ||
		'ООО "Стоматологическая клиника ДЕНТЕ"';

	const patientName = patient?.fullName || "Пациент клиники";
	const doctor = doctorFullName || "Лечащий врач-стоматолог";

	const handlePrint = () => {
		setIsPrinting(true);
		try {
			if (onPrint) {
				onPrint();
			} else if (typeof window !== "undefined") {
				window.print();
			}
		} finally {
			setIsPrinting(false);
		}
	};

	const handleDownloadPdf = () => {
		if (onDownloadPdf) {
			onDownloadPdf();
			return;
		}
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleFillNorm = () => {
		setQuestionsAnswered(true);
		setRisksUnderstood(true);
		setWithdrawUnderstood(true);
		store.setInformedConsentQuestionsAnswered(true);
		store.setInformedConsentRisksUnderstood(true);
		store.setInformedConsentWithdrawUnderstood(true);
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col justify-start items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="informed-consent-viewer-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Информированное добровольное согласие"
		>
			<div className="relative w-full max-w-[860px] bg-[var(--paper)] text-[var(--ink)] rounded-none sm:rounded-xl shadow-2xl border border-[var(--line)] flex flex-col my-auto overflow-hidden">
				{/* Header */}
				<header className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
							<ShieldCheck size={18} />
						</div>
						<div>
							<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight flex items-center gap-2">
								<span>Информированное добровольное согласие (ИДС 1051н)</span>
								<span
									className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
										isSigned
											? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
											: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
									}`}
								>
									{isSigned ? "ПОДПИСАНО" : "ЧЕРНОВИК"}
								</span>
							</h2>
							<p className="text-[12px] text-[var(--muted)]">
								{patientName} · {todayRu} · {clinicName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleFillNorm}
							className="secondary-button h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
							data-testid="consent-fill-norm-btn"
							title="Заполнить нормативные отметки согласия"
						>
							<Sparkles size={14} className="text-teal-600 dark:text-teal-400" />
							<span>Заполнить нормой</span>
						</button>

						<button
							type="button"
							onClick={handlePrint}
							disabled={isPrinting}
							className="primary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
							data-testid="consent-print-btn"
							title="Печать бланка ИДС"
						>
							<Printer size={14} />
							<span>Печать ИДС</span>
						</button>

						<button
							type="button"
							onClick={handleDownloadPdf}
							className="secondary-button h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
							data-testid="consent-pdf-btn"
							title="Сохранить в PDF"
						>
							<Download size={14} />
							<span>PDF</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
							data-testid="consent-close-btn"
							aria-label="Закрыть окно"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Document Body */}
				<main className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-4 text-[13px] leading-relaxed text-[var(--ink)] bg-[var(--paper)]">
					{/* Clinic and Statutory Header */}
					<div className="text-center border-b border-[var(--line)] pb-3">
						<h3 className="text-[14px] font-bold uppercase tracking-wide">
							Информированное добровольное согласие на медицинское вмешательство
						</h3>
						<p className="text-[12px] text-[var(--muted)] mt-1">
							В соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ
							и Приказом Министерства здравоохранения РФ от 12.11.2021 № 1051н
						</p>
					</div>

					{/* Patient & Clinic Metadata Box */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[12px]">
						<div>
							<span className="text-[var(--muted)] block">Медицинская организация:</span>
							<strong>{clinicName}</strong>
						</div>
						<div>
							<span className="text-[var(--muted)] block">Пациент:</span>
							<strong>{patientName}</strong>
						</div>
						<div>
							<span className="text-[var(--muted)] block">Лечащий врач:</span>
							<strong>{doctor}</strong>
						</div>
						<div>
							<span className="text-[var(--muted)] block">Область вмешательства:</span>
							<strong>{toothOrArea}</strong> (Диагноз: {diagnosis})
						</div>
					</div>

					{/* Statutory Text */}
					<div className="space-y-3 text-[12.5px] text-[var(--ink)]">
						<p>
							Я, <strong>{patientName}</strong>, даю информированное добровольное согласие
							на проведение медицинского вмешательства: <strong>{interventionName}</strong>.
						</p>
						<p>
							Мне в доступной форме разъяснены цели, методы оказания медицинской помощи,
							связанный с ними риск, возможные варианты медицинских вмешательств,
							их последствия, в том числе вероятность развития осложнений,
							а также предполагаемые результаты оказания медицинской помощи.
						</p>
						<p>
							Мне разъяснено, что я имею право отказаться от медицинского вмешательства
							или потребовать его прекращения в любой момент, за исключением случаев,
							предусмотренных частью 9 статьи 20 Федерального закона № 323-ФЗ.
						</p>
					</div>

					{/* Patient Declarations */}
					<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
						<label className="flex items-start gap-2.5 cursor-pointer text-[12.5px]">
							<input
								type="checkbox"
								checked={questionsAnswered}
								onChange={(e) => setQuestionsAnswered(e.target.checked)}
								className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
							/>
							<span>На все заданные мной вопросы получены исчерпывающие и понятные ответы врача.</span>
						</label>

						<label className="flex items-start gap-2.5 cursor-pointer text-[12.5px]">
							<input
								type="checkbox"
								checked={risksUnderstood}
								onChange={(e) => setRisksUnderstood(e.target.checked)}
								className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
							/>
							<span>Риски и возможные осложнения стоматологического вмешательства разъяснены и понятны.</span>
						</label>

						<label className="flex items-start gap-2.5 cursor-pointer text-[12.5px]">
							<input
								type="checkbox"
								checked={withdrawUnderstood}
								onChange={(e) => setWithdrawUnderstood(e.target.checked)}
								className="mt-0.5 rounded text-[var(--teal)] focus:ring-[var(--teal)]"
							/>
							<span>Право на отзыв согласия разъяснено. С планом лечения согласен.</span>
						</label>
					</div>

					{/* Signatures Footer */}
					<div className="pt-4 border-t border-[var(--line)] grid grid-cols-2 gap-6 text-[12px]">
						<div>
							<span className="text-[var(--muted)] block">Пациент (законный представитель):</span>
							<div className="mt-4 border-b border-[var(--ink)] pb-1 flex justify-between">
								<span>{patientName}</span>
								<span className="text-[var(--muted)] font-mono">/ подпись /</span>
							</div>
						</div>
						<div>
							<span className="text-[var(--muted)] block">Врач:</span>
							<div className="mt-4 border-b border-[var(--ink)] pb-1 flex justify-between">
								<span>{doctor}</span>
								<span className="text-[var(--muted)] font-mono">/ подпись /</span>
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
};

InformedConsentViewer.displayName = "InformedConsentViewer";
