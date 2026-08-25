import {
	type MdlpCarpuleQueueItem,
	type SeniorNurseDisposalActData,
	formatSeniorNurseDisposalActData,
	generateSeniorNurseDisposalActHtml,
} from "@dental/shared";
import {
	Check,
	Download,
	FileText,
	Printer,
	ShieldCheck,
	UserCheck,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./mdlpInventory.css";

export interface SeniorNurseDisposalActModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly MdlpCarpuleQueueItem[];
	readonly organizationName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationAddress?: string | undefined;
	readonly departmentName?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly initialSeniorNurseName?: string | undefined;
	readonly initialChiefDoctorName?: string | undefined;
	readonly initialDentistName?: string | undefined;
}

export const SeniorNurseDisposalActModal: React.FC<
	SeniorNurseDisposalActModalProps
> = ({
	isOpen,
	onClose,
	items,
	organizationName = 'ООО "ДЕНТЕ КЛИНИК"',
	organizationInn = "7701234567",
	organizationAddress = "г. Москва, ул. Клиническая, д. 10, стр. 2",
	departmentName = "Стоматологическое отделение",
	cabinetName = "Кабинет №1 (Терапия / Хирургия)",
	initialSeniorNurseName = "Иванова Е.В.",
	initialChiefDoctorName = "Петров А.С.",
	initialDentistName = "Кузнецов М.С.",
}) => {
	const now = new Date();
	const [actNumber, setActNumber] = useState<string>(
		() =>
			`СПИС-${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`,
	);
	const [actDate, setActDate] = useState<string>(
		() => now.toISOString().slice(0, 10),
	);
	const [seniorNurseName, setSeniorNurseName] = useState<string>(
		initialSeniorNurseName,
	);
	const [chiefDoctorName, setChiefDoctorName] = useState<string>(
		initialChiefDoctorName,
	);
	const [dentistName, setDentistName] = useState<string>(initialDentistName);
	const [notes, setNotes] = useState<string>("");

	const actData: SeniorNurseDisposalActData = useMemo(() => {
		return formatSeniorNurseDisposalActData({
			actNumber,
			actDate,
			organizationName,
			organizationInn,
			organizationAddress,
			departmentName,
			cabinetName,
			seniorNurseName,
			chiefDoctorName,
			dentistName,
			notes: notes.trim() || undefined,
			items,
		});
	}, [
		actNumber,
		actDate,
		organizationName,
		organizationInn,
		organizationAddress,
		departmentName,
		cabinetName,
		seniorNurseName,
		chiefDoctorName,
		dentistName,
		notes,
		items,
	]);

	const actHtml = useMemo(() => {
		return generateSeniorNurseDisposalActHtml(actData);
	}, [actData]);

	const handlePrint = () => {
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(actHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	};

	const handleDownloadHtml = () => {
		const blob = new Blob([actHtml], { type: "text/html;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Акт_списания_${actNumber}.html`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="mdlp-modal-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="mdlp-act-title"
			data-testid="senior-nurse-disposal-act-modal"
		>
			<div
				className="mdlp-modal-container"
				style={{ maxWidth: "1000px" }}
				onClick={(e) => e.stopPropagation()}
			>
				<header className="mdlp-modal-header">
					<div className="mdlp-modal-title" id="mdlp-act-title">
						<FileText size={24} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<div className="font-bold text-lg leading-tight">
								Акт списания медикаментов и анестетиков (Старшая медсестра)
							</div>
							<div className="text-xs text-muted mt-0.5">
								Официальная медицинская форма • Честный ЗНАК (Схема 10560) •
								Позиций: {items.length}
							</div>
						</div>
					</div>

					<button
						type="button"
						className="mdlp-btn mdlp-btn-ghost p-2"
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</header>

				<div className="mdlp-modal-body">
					{/* Паспорт и комиссия */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-line bg-paper-soft">
						<div>
							<label
								htmlFor="act-number-input"
								className="text-xs font-semibold text-muted block mb-1"
							>
								Номер акта
							</label>
							<input
								id="act-number-input"
								type="text"
								value={actNumber}
								onChange={(e) => setActNumber(e.target.value)}
								className="w-full h-9 px-2.5 rounded border border-line bg-paper text-xs font-mono font-bold text-ink"
							/>
						</div>

						<div>
							<label
								htmlFor="act-date-input"
								className="text-xs font-semibold text-muted block mb-1"
							>
								Дата акта
							</label>
							<input
								id="act-date-input"
								type="date"
								value={actDate}
								onChange={(e) => setActDate(e.target.value)}
								className="w-full h-9 px-2.5 rounded border border-line bg-paper text-xs text-ink"
							/>
						</div>

						<div>
							<label
								htmlFor="act-nurse-input"
								className="text-xs font-semibold text-muted block mb-1"
							>
								Старшая медицинская сестра
							</label>
							<input
								id="act-nurse-input"
								type="text"
								value={seniorNurseName}
								onChange={(e) => setSeniorNurseName(e.target.value)}
								className="w-full h-9 px-2.5 rounded border border-line bg-paper text-xs text-ink font-semibold"
							/>
						</div>

						<div>
							<label
								htmlFor="act-chief-input"
								className="text-xs font-semibold text-muted block mb-1"
							>
								Главный врач (Утверждающий)
							</label>
							<input
								id="act-chief-input"
								type="text"
								value={chiefDoctorName}
								onChange={(e) => setChiefDoctorName(e.target.value)}
								className="w-full h-9 px-2.5 rounded border border-line bg-paper text-xs text-ink"
							/>
						</div>

						<div>
							<label
								htmlFor="act-dentist-input"
								className="text-xs font-semibold text-muted block mb-1"
							>
								Врач-стоматолог (МОЛ)
							</label>
							<input
								id="act-dentist-input"
								type="text"
								value={dentistName}
								onChange={(e) => setDentistName(e.target.value)}
								className="w-full h-9 px-2.5 rounded border border-line bg-paper text-xs text-ink"
							/>
						</div>

						<div>
							<label
								htmlFor="act-notes-input"
								className="text-xs font-semibold text-muted block mb-1"
							>
								Примечание
							</label>
							<input
								id="act-notes-input"
								type="text"
								placeholder="Плановое списание карпул..."
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								className="w-full h-9 px-2.5 rounded border border-line bg-paper text-xs text-ink"
							/>
						</div>
					</div>

					{/* Предпросмотр печатной формы */}
					<div className="border border-line rounded-lg overflow-hidden bg-white">
						<iframe
							title="Предпросмотр акта списания"
							srcDoc={actHtml}
							className="w-full h-[400px] border-0"
						/>
					</div>
				</div>

				<footer className="mdlp-modal-footer">
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="mdlp-btn mdlp-btn-secondary"
							onClick={handleDownloadHtml}
							title="Скачать HTML-файл акта"
						>
							<Download size={16} /> Скачать HTML
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							className="mdlp-btn mdlp-btn-secondary"
							onClick={onClose}
						>
							Закрыть
						</button>

						<button
							type="button"
							className="mdlp-btn mdlp-btn-primary"
							onClick={handlePrint}
						>
							<Printer size={18} /> Печать акта списания
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};
