import React, { useState, useMemo } from "react";
import {
	X,
	Printer,
	Copy,
	Check,
	FileText,
	AlertTriangle,
	Sparkles,
} from "lucide-react";
import {
	POST_OP_PATIENT_MEMOS,
	getPostOpPatientMemo,
	generatePatientMemoText,
	renderPatientMemoPrintHtml,
	type PostOpMemoId,
} from "../../lib/clinicalProtocols043";
import { showToast } from "../GlobalToast";

export interface PatientMemoPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialMemoId?: PostOpMemoId | string | undefined;
	readonly patient?: {
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly cardNumber?: string | null | undefined;
	} | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly toothNumber?: string | number | null | undefined;
	readonly onApplyToSoap?: ((memoText: string) => void) | undefined;
}

export function PatientMemoPrintModal({
	isOpen,
	onClose,
	initialMemoId = "surgery_extraction",
	patient,
	doctorName,
	doctorSpecialty = "Врач-стоматолог",
	clinicName = "Стоматологическая клиника «DENTE»",
	clinicPhone = "+7 (495) 777-88-99",
	toothNumber,
	onApplyToSoap,
}: PatientMemoPrintModalProps) {
	const [selectedMemoId, setSelectedMemoId] = useState<PostOpMemoId>(
		(initialMemoId as PostOpMemoId) || "surgery_extraction",
	);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const activeMemo = useMemo(() => {
		return getPostOpPatientMemo(selectedMemoId);
	}, [selectedMemoId]);

	const memoRenderOptions = useMemo(() => {
		return {
			patientFullName: patient?.fullName || "Пациент",
			patientBirthDate: patient?.birthDate || undefined,
			doctorFullName: doctorName || "Врач-стоматолог",
			doctorSpecialty: doctorSpecialty || "Стоматолог-терапевт",
			clinicName: clinicName || "Стоматологическая клиника «DENTE»",
			clinicPhone: clinicPhone || "+7 (495) 777-88-99",
			toothNumber: toothNumber || undefined,
			visitDate: new Date().toLocaleDateString("ru-RU"),
		};
	}, [patient, doctorName, doctorSpecialty, clinicName, clinicPhone, toothNumber]);

	const fullText = useMemo(() => {
		return generatePatientMemoText(selectedMemoId, memoRenderOptions);
	}, [selectedMemoId, memoRenderOptions]);

	const htmlSheet = useMemo(() => {
		return renderPatientMemoPrintHtml(selectedMemoId, memoRenderOptions);
	}, [selectedMemoId, memoRenderOptions]);

	const handleCopy = () => {
		try {
			navigator.clipboard.writeText(fullText);
			setIsCopied(true);
			showToast("Текст памятки скопирован в буфер для отправки пациенту", "success", 3500);
			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать текст в буфер", "warning", 3000);
		}
	};

	const handlePrint = () => {
		const printFrame = document.createElement("iframe");
		printFrame.style.position = "fixed";
		printFrame.style.right = "0";
		printFrame.style.bottom = "0";
		printFrame.style.width = "0";
		printFrame.style.height = "0";
		printFrame.style.border = "0";
		document.body.appendChild(printFrame);

		const doc = printFrame.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<title>${activeMemo.title}</title>
					<style>
						@page { size: A4 portrait; margin: 12mm 15mm; }
						body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
						* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
					</style>
				</head>
				<body>
					${htmlSheet}
					<script>
						window.onload = function() {
							window.print();
							setTimeout(function() {
								window.frameElement.parentNode.removeChild(window.frameElement);
							}, 500);
						};
					</script>
				</body>
				</html>
			`);
			doc.close();
		} else {
			window.print();
		}
	};

	const handleApplySoap = () => {
		if (onApplyToSoap) {
			const snippet = `Выдана «${activeMemo.title}». Пациент проинструктирован по послеоперационному режиму и правилам ухода.`;
			onApplyToSoap(snippet);
			showToast(`Памятка «${activeMemo.shortTitle}» внесена в протокол приёма`, "success", 3000);
		}
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="patient-memo-modal-title"
		>
			<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-3xl rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
				{/* Modal Header */}
				<div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3.5">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] flex items-center justify-center shrink-0 border border-[var(--teal-soft)]">
							<FileText size={22} />
						</div>
						<div>
							<h3 id="patient-memo-modal-title" className="text-base font-extrabold text-[var(--ink)] m-0 flex items-center gap-2">
								<span>Послеоперационные памятки пациенту (1-клик печать А4/А5)</span>
								<span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)]">
									Форма 043/у
								</span>
							</h3>
							<p className="text-xs text-[var(--muted)] m-0 leading-relaxed mt-0.5">
								Официальные клинические рекомендации по уходу, режиму и обезболиванию после приёма
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-10 h-10 rounded-xl hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center justify-center cursor-pointer"
						aria-label="Закрыть окно печати памятки"
					>
						<X size={20} />
					</button>
				</div>

				{/* 3 Memo Selector Tabs */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
					{POST_OP_PATIENT_MEMOS.map((memo) => {
						const isSelected = selectedMemoId === memo.id;
						return (
							<button
								key={memo.id}
								type="button"
								onClick={() => setSelectedMemoId(memo.id)}
								className={`p-3 rounded-xl border text-left transition-all min-h-[48px] flex items-start gap-2.5 cursor-pointer touch-manipulation ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] shadow-xs ring-1 ring-[var(--teal)]"
										: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))]/40"
								}`}
								data-testid={`btn-memo-tab-${memo.id}`}
							>
								<span className="text-xl shrink-0 mt-0.5">{memo.icon}</span>
								<div className="min-w-0 flex-1">
									<div className="text-xs sm:text-sm font-extrabold truncate">
										{memo.shortTitle}
									</div>
									<div className="text-[11px] opacity-80 line-clamp-1 mt-0.5">
										{memo.summary}
									</div>
								</div>
							</button>
						);
					})}
				</div>

				{/* Live Memo Preview Box */}
				<div className="flex-1 overflow-y-auto space-y-3 min-h-[260px] max-h-[380px] p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] pr-2">
					<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2 flex-wrap">
						<div className="flex items-center gap-2">
							<span className="text-xl">{activeMemo.icon}</span>
							<strong className="text-sm font-extrabold text-[var(--ink)]">
								{activeMemo.title}
							</strong>
						</div>
						<span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]">
							{toothNumber ? `Зуб ${toothNumber}` : "Область вмешательства"} • {new Date().toLocaleDateString("ru-RU")}
						</span>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-extrabold uppercase text-[var(--muted)] tracking-wider">
							Обязательные правила и рекомендации:
						</div>
						<div className="space-y-1.5">
							{activeMemo.keyRules.map((rule, idx) => (
								<div
									key={idx}
									className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] leading-relaxed flex items-start gap-2"
								>
									<span className="font-mono font-bold text-[var(--teal,var(--brand-primary))] shrink-0">
										{idx + 1}.
									</span>
									<span>{rule}</span>
								</div>
							))}
						</div>
					</div>

					<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
						<div className="text-xs font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
							<AlertTriangle size={15} className="text-rose-600 dark:text-rose-400" />
							<span>Срочно связаться с клиникой ({clinicPhone}) при:</span>
						</div>
						<ul className="m-0 pl-4 text-xs text-rose-800 dark:text-rose-300 space-y-1 font-medium">
							{activeMemo.urgentTriggers.map((t, idx) => (
								<li key={idx}>• {t}</li>
							))}
						</ul>
					</div>
				</div>

				{/* Modal Footer Controls */}
				<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2.5 flex-wrap">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopy}
							className="min-h-[48px] px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
							data-testid="btn-copy-memo-text"
							title="Скопировать текст памятки для отправки в WhatsApp / Telegram"
						>
							{isCopied ? <Check size={16} className="text-[var(--ok-fg)]" /> : <Copy size={16} />}
							<span>{isCopied ? "Скопировано!" : "Скопировать текст"}</span>
						</button>

						{onApplyToSoap && (
							<button
								type="button"
								onClick={handleApplySoap}
								className="min-h-[48px] px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border border-[var(--teal,var(--line))]/30 bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-soft,var(--paper-soft))] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
								data-testid="btn-apply-memo-soap"
							>
								<Sparkles size={16} className="text-[var(--teal,var(--brand-primary))]" />
								<span>В протокол 043/у</span>
							</button>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--ink)] transition-colors cursor-pointer"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[48px] px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
							data-testid="btn-print-active-memo"
						>
							<Printer size={18} />
							<span>Распечатать памятку (А4 / А5)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
