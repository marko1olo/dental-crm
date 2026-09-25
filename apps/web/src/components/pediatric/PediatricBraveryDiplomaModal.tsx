/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC BRAVERY DIPLOMA MODAL (ДИПЛОМ ЗА ХРАБРОСТЬ)
 * 1-Click Printable Certificate for Young Dental Patients
 * Zero Emojis (Lucide Vector Icons Only) | Anti-Matryoshka Depth = 1
 * Mandates 8d, 8e, 8k, 8n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Award,
	Check,
	Copy,
	Heart,
	Printer,
	ShieldCheck,
	Sparkles,
	Star,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";

export interface PediatricBraveryDiplomaModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly visitDate?: string | undefined;
}

export const PediatricBraveryDiplomaModal: React.FC<PediatricBraveryDiplomaModalProps> = ({
	isOpen,
	onClose,
	patientName = "Юный пациент",
	patientAgeYears = 6,
	doctorName = "Врач-стоматолог детский",
	clinicName = "Детское отделение DENTE",
	visitDate,
}) => {
	const effectiveDate = useMemo(() => {
		if (visitDate) return visitDate;
		return new Date().toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	}, [visitDate]);

	const [heroName, setHeroName] = useState<string>(patientName || "Юный герой");
	const [praiseText, setPraiseText] = useState<string>(
		"Награждается за невероятную храбрость, ослепительную улыбку и дружбу с Зубной Феей на приеме у врача-стоматолога!",
	);

	const handlePrintDiploma = useCallback(() => {
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Разрешите всплывающие окна в браузере для печати диплома", "error");
			return;
		}

		printWindow.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="UTF-8">
				<title>Диплом за храбрость — ${heroName}</title>
				<style>
					@page {
						size: A4 landscape;
						margin: 10mm;
					}
					* {
						box-sizing: border-box;
					}
					body {
						margin: 0;
						padding: 24px;
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
						background: #ffffff;
						color: #0f172a;
						display: flex;
						align-items: center;
						justify-content: center;
						min-height: 100vh;
					}
					.diploma-card {
						width: 100%;
						max-width: 960px;
						border: 8px double #d97706;
						border-radius: 24px;
						padding: 40px;
						text-align: center;
						background: linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fef3c7 100%);
						box-shadow: 0 10px 30px rgba(217, 119, 6, 0.15);
						position: relative;
					}
					.diploma-badge {
						display: inline-block;
						background: #d97706;
						color: #ffffff;
						font-weight: 900;
						font-size: 14px;
						letter-spacing: 2px;
						text-transform: uppercase;
						padding: 6px 20px;
						border-radius: 20px;
						margin-bottom: 16px;
					}
					.diploma-title {
						font-size: 38px;
						font-weight: 900;
						color: #92400e;
						text-transform: uppercase;
						letter-spacing: 1px;
						margin: 0 0 12px 0;
					}
					.diploma-subtitle {
						font-size: 18px;
						color: #b45309;
						font-weight: 600;
						margin: 0 0 24px 0;
					}
					.hero-name {
						font-size: 36px;
						font-weight: 900;
						color: #0f172a;
						border-bottom: 3px solid #d97706;
						display: inline-block;
						padding: 0 24px 8px 24px;
						margin: 8px 0 24px 0;
					}
					.diploma-text {
						font-size: 18px;
						line-height: 1.6;
						color: #334155;
						max-width: 720px;
						margin: 0 auto 32px auto;
						font-weight: 500;
					}
					.signatures {
						display: flex;
						justify-content: space-between;
						align-items: flex-end;
						margin-top: 40px;
						padding-top: 24px;
						border-top: 2px dashed #fcd34d;
					}
					.sig-item {
						text-align: left;
					}
					.sig-item.right {
						text-align: right;
					}
					.sig-label {
						font-size: 12px;
						color: #64748b;
						text-transform: uppercase;
						font-weight: 700;
					}
					.sig-value {
						font-size: 15px;
						font-weight: 800;
						color: #0f172a;
						margin-top: 4px;
					}
					.fairy-seal {
						width: 90px;
						height: 90px;
						border-radius: 50%;
						border: 3px solid #d97706;
						background: #fff;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						margin: 0 auto;
						font-size: 11px;
						font-weight: 900;
						color: #d97706;
						text-transform: uppercase;
					}
					@media print {
						body {
							padding: 0;
						}
						.diploma-card {
							box-shadow: none;
						}
					}
				</style>
			</head>
			<body>
				<div class="diploma-card">
					<div class="diploma-badge">Орден Зубной Феи</div>
					<h1 class="diploma-title">Диплом за храбрость</h1>
					<div class="diploma-subtitle">Настоящему герою стоматологического кресла</div>

					<div>
						<div class="hero-name">${heroName}</div>
					</div>

					<p class="diploma-text">
						${praiseText}
					</p>

					<div class="fairy-seal">
						<span style="font-size: 16px;">★ ★ ★</span>
						<span>Зубки</span>
						<span>Здоровы!</span>
					</div>

					<div class="signatures">
						<div class="sig-item">
							<div class="sig-label">Врач-стоматолог:</div>
							<div class="sig-value">${doctorName}</div>
						</div>
						<div class="sig-item">
							<div class="sig-label">Дата визита:</div>
							<div class="sig-value">${effectiveDate}</div>
						</div>
						<div class="sig-item right">
							<div class="sig-label">Клиника:</div>
							<div class="sig-value">${clinicName}</div>
						</div>
					</div>
				</div>
				<script>
					window.print();
					window.close();
				</script>
			</body>
			</html>
		`);
		printWindow.document.close();
		showToast(`Диплом за храбрость для ${heroName} отправлен на печать!`, "success", 2500);
	}, [clinicName, doctorName, effectiveDate, heroName, praiseText]);

	const handleCopyDiplomaText = useCallback(async () => {
		const text = [
			"★ ДИПЛОМ ЗА ХРАБРОСТЬ ★",
			`Награждается: ${heroName}`,
			`Возраст: ${patientAgeYears} лет`,
			praiseText,
			`Врач: ${doctorName}`,
			`Клиника: ${clinicName}`,
			`Дата: ${effectiveDate}`,
		].join("\n");

		try {
			await navigator.clipboard.writeText(text);
			showToast("Текст диплома скопирован в буфер обмена!", "success", 2000);
		} catch {
			showToast("Не удалось скопировать текст диплома", "error");
		}
	}, [clinicName, doctorName, effectiveDate, heroName, patientAgeYears, praiseText]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pediatric-bravery-diploma-title"
		>
			<div
				className="relative flex flex-col w-full max-w-2xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--line,#cbd5e1)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Шапка модалки */}
				<div className="flex items-center justify-between p-4 sm:px-6 border-b border-[var(--line,#e2e8f0)] bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
							<Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
						</div>
						<div className="min-w-0">
							<h2
								id="pediatric-bravery-diploma-title"
								className="text-base sm:text-lg font-black tracking-tight text-[var(--ink,#0f172a)] truncate"
							>
								Диплом за храбрость маленькому пациенту
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] font-medium truncate">
								1-клик печать памятной грамоты с именем ребенка и датой
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={handlePrintDiploma}
							className="min-h-[36px] px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
							title="1-клик Печать диплома"
							data-testid="btn-print-bravery-diploma"
						>
							<Printer className="w-4 h-4" />
							<span>1-клик Печать</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[36px] min-w-[36px] p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-all cursor-pointer flex items-center justify-center"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Тело модалки: Живое превью диплома */}
				<div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
					{/* Интерактивные поля имени и текста */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label htmlFor="diploma-hero-name" className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
								Имя ребенка на дипломе:
							</label>
							<input
								id="diploma-hero-name"
								type="text"
								value={heroName}
								onChange={(e) => setHeroName(e.target.value)}
								placeholder="Например: Миша Смирнов"
								className="w-full h-9 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-extrabold text-[var(--ink,#0f172a)] focus:border-amber-500 focus:outline-hidden"
								data-testid="input-diploma-hero-name"
							/>
						</div>
						<div>
							<label htmlFor="diploma-visit-date" className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
								Дата приема:
							</label>
							<input
								id="diploma-visit-date"
								type="text"
								value={effectiveDate}
								readOnly
								className="w-full h-9 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-sm font-mono font-bold text-[var(--muted,#64748b)]"
								data-testid="input-diploma-date"
							/>
						</div>
					</div>

					{/* Красивое живое превью диплома в сертификатной рамке */}
					<div
						className="relative rounded-2xl border-4 border-double border-amber-400 dark:border-amber-600 bg-gradient-to-br from-amber-50/70 via-white to-amber-100/40 dark:from-amber-950/20 dark:via-neutral-900 dark:to-amber-950/40 p-6 text-center shadow-md select-none"
						data-testid="diploma-certificate-preview"
					>
						{/* Угловые звездочки */}
						<div className="flex justify-between items-center text-amber-500 mb-2">
							<Star className="w-5 h-5 fill-amber-400 text-amber-500" />
							<span className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 bg-amber-200/50 dark:bg-amber-900/40 px-3 py-1 rounded-full">
								Орден Зубной Феи
							</span>
							<Star className="w-5 h-5 fill-amber-400 text-amber-500" />
						</div>

						<h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-amber-800 dark:text-amber-300 mt-1 mb-1">
							Диплом за храбрость
						</h3>
						<div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
							Настоящему герою стоматологического кресла
						</div>

						<div className="inline-block border-b-2 border-amber-500 px-6 py-1 my-2">
							<span className="text-xl sm:text-2xl font-black text-[var(--ink,#0f172a)] font-serif">
								{heroName}
							</span>
						</div>

						<p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium max-w-md mx-auto my-3 leading-relaxed">
							{praiseText}
						</p>

						<div className="flex items-center justify-center gap-1 text-amber-500 my-2">
							<Sparkles className="w-4 h-4" />
							<span className="text-xs font-bold text-amber-700 dark:text-amber-400">
								Зубки под надежной защитой!
							</span>
							<Sparkles className="w-4 h-4" />
						</div>

						{/* Подписи внизу превью */}
						<div className="mt-4 pt-3 border-t border-dashed border-amber-300 dark:border-amber-700 flex flex-wrap justify-between items-center text-[11px] text-[var(--muted,#64748b)]">
							<div className="text-left">
								<span className="block font-semibold">Врач:</span>
								<strong className="text-[var(--ink,#0f172a)] font-bold">{doctorName}</strong>
							</div>
							<div className="text-center">
								<span className="block font-semibold">Дата:</span>
								<strong className="text-[var(--ink,#0f172a)] font-mono">{effectiveDate}</strong>
							</div>
							<div className="text-right">
								<span className="block font-semibold">Клиника:</span>
								<strong className="text-[var(--ink,#0f172a)] font-bold">{clinicName}</strong>
							</div>
						</div>
					</div>
				</div>

				{/* Подвал */}
				<div className="flex items-center justify-between p-4 sm:px-6 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
					<span className="text-xs text-[var(--muted,#64748b)] font-medium">
						Выдается ребенку сразу после окончания приема
					</span>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyDiplomaText}
							className="min-h-[36px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="btn-copy-diploma-text"
						>
							<Copy className="w-3.5 h-3.5" />
							<span>Копировать</span>
						</button>

						<button
							type="button"
							onClick={handlePrintDiploma}
							className="min-h-[36px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition active:scale-95"
							data-testid="btn-modal-print-diploma"
						>
							<Printer className="w-4 h-4" />
							<span>Печать диплома</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};

export default PediatricBraveryDiplomaModal;
