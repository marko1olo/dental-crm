import {
	Activity,
	AlertTriangle,
	Camera,
	CheckCircle2,
	ChevronDown,
	Clipboard,
	Clock,
	FileText,
	Lock,
	Paperclip,
	Printer,
	Search,
	ShieldCheck,
	Stethoscope,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { emptyVisitNoteForm } from "../AppHelpers";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { useVisitStore } from "../store/visitStore";
import { showToast } from "./GlobalToast";

// ─── ICD-10 Стоматологический справочник ────────────────────────────────────
const ICD10_DICTIONARY = [
	// Кариес K02
	{ code: "K02.0", label: "Кариес эмали", group: "Кариес" },
	{ code: "K02.1", label: "Кариес дентина", group: "Кариес" },
	{ code: "K02.2", label: "Кариес цемента", group: "Кариес" },
	{ code: "K02.3", label: "Приостановившийся кариес", group: "Кариес" },
	{ code: "K02.8", label: "Другой уточнённый кариес", group: "Кариес" },
	// Болезни пульпы K04
	{ code: "K04.0", label: "Пульпит", group: "Пульпа" },
	{ code: "K04.01", label: "Начальный (гиперемия) пульпит", group: "Пульпа" },
	{ code: "K04.1", label: "Некроз пульпы", group: "Пульпа" },
	{ code: "K04.2", label: "Дегенерация пульпы", group: "Пульпа" },
	{ code: "K04.3", label: "Патологическая резорбция корня", group: "Пульпа" },
	{
		code: "K04.4",
		label: "Острый апикальный периодонтит",
		group: "Периапикал",
	},
	{
		code: "K04.5",
		label: "Хронический апикальный периодонтит",
		group: "Периапикал",
	},
	{
		code: "K04.6",
		label: "Периапикальный абсцесс со свищом",
		group: "Периапикал",
	},
	{
		code: "K04.7",
		label: "Периапикальный абсцесс без свища",
		group: "Периапикал",
	},
	{ code: "K04.8", label: "Корневая киста", group: "Периапикал" },
	// Гингивит / Пародонт K05
	{ code: "K05.0", label: "Острый гингивит", group: "Пародонт" },
	{ code: "K05.1", label: "Хронический гингивит", group: "Пародонт" },
	{ code: "K05.2", label: "Острый пародонтит", group: "Пародонт" },
	{ code: "K05.3", label: "Хронический пародонтит", group: "Пародонт" },
	{ code: "K05.4", label: "Пародонтоз", group: "Пародонт" },
	// Болезни зубов K03
	{ code: "K03.0", label: "Повышенное стирание зубов", group: "Другое" },
	{ code: "K03.2", label: "Эрозия зубов", group: "Другое" },
	{ code: "K03.3", label: "Патологическая резорбция", group: "Другое" },
	// Аномалии K07
	{ code: "K07.3", label: "Аномалии положения зубов", group: "Ортодонтия" },
	{
		code: "K07.4",
		label: "Аномалии прикуса неуточнённые",
		group: "Ортодонтия",
	},
	// Ретинированный зуб
	{ code: "K01.1", label: "Ретинированный зуб", group: "Хирургия" },
	// Потеря зубов K08
	{ code: "K08.1", label: "Потеря зуба / Удаление зуба", group: "Хирургия" },
	{ code: "K08.2", label: "Атрофия альвеолярного отростка", group: "Хирургия" },
	// Профилактика / Консультация Z
	{
		code: "Z01.2",
		label: "Стоматологическое обследование",
		group: "Консультация",
	},
	{
		code: "Z29.8",
		label: "Профилактика кариеса (герметики, фторирование)",
		group: "Консультация",
	},
	{
		code: "Z51.8",
		label: "Ортопедическое/плановое лечение",
		group: "Консультация",
	},
];

const ICD_GROUP_COLORS: Record<string, string> = {
	Кариес: "bg-red-500/10 text-red-400 border-red-500/25",
	Пульпа: "bg-amber-500/10 text-amber-400 border-amber-500/25",
	Периапикал: "bg-orange-500/10 text-orange-400 border-orange-500/25",
	Пародонт: "bg-purple-500/10 text-purple-400 border-purple-500/25",
	Ортодонтия: "bg-blue-500/10 text-blue-400 border-blue-500/25",
	Хирургия: "bg-rose-500/10 text-rose-400 border-rose-500/25",
	Другое: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
	Консультация: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
};

function getIcdColor(code: string): string {
	const entry = ICD10_DICTIONARY.find((i) => i.code === code);
	return (
		ICD_GROUP_COLORS[entry?.group ?? "Другое"] ??
		"bg-zinc-500/10 text-zinc-400 border-zinc-500/25"
	);
}

interface DiaryState {
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
	treatmentDescription: string;
}

const EMPTY_DIARY: DiaryState = {
	anamnesis: "",
	statusLocalis: "",
	diagnosisIcd10: "",
	diagnosisTooth: "",
	treatmentDescription: "",
};

interface Template {
	id: string;
	title: string;
	category?: string;
	specialty?: string;
	prefilledAnamnesis?: string;
	prefilledObjective?: string;
	prefilledTreatment?: string;
	defaultIcd10?: string;
	defaultIcd10Label?: string;
	isBuiltIn?: boolean;
}

interface VisitDiaryEditorProps {
	visitId: string;
	patientId: string;
}

export const VisitDiaryEditor: React.FC<VisitDiaryEditorProps> = ({
	visitId,
	patientId,
}) => {
	const { activeDoctor } = useAppLogicContext();
	const [templates, setTemplates] = useState<Template[]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState("");
	const [diary, setDiary] = useState<DiaryState>(EMPTY_DIARY);
	const [diaryId, setDiaryId] = useState<string | null>(null);
	const [isLocked, setIsLocked] = useState(false);
	const [lockedAt, setLockedAt] = useState<string | null>(null);
	const [diaryHash, setDiaryHash] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [showScanner, setShowScanner] = useState(false);
	const [trayBarcode, setTrayBarcode] = useState<string | null>(null);
	const [showIcdDropdown, setShowIcdDropdown] = useState(false);
	const [icdSearch, setIcdSearch] = useState("");
	const [showPreview, setShowPreview] = useState(false);
	const [showPinDialog, setShowPinDialog] = useState(false);
	const [pinCode, setPinCode] = useState("");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [revisionCount, setRevisionCount] = useState(0);
	const [attachments, setAttachments] = useState<
		{ id: string; url: string; name: string }[]
	>([]);
	const [isUploading, setIsUploading] = useState(false);

	const icdRef = useRef<HTMLDivElement>(null);
	const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// ── Auto-resize textareas
	const autoResize = (el: HTMLTextAreaElement) => {
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	};
	const handleAutoResize = (
		e:
			| React.ChangeEvent<HTMLTextAreaElement>
			| React.FocusEvent<HTMLTextAreaElement>,
	) => autoResize(e.target);

	// ── Cleanup & load on visitId change
	useEffect(() => {
		let alive = true;

		setDiary(EMPTY_DIARY);
		setSelectedTemplate("");
		setIcdSearch("");
		setShowPreview(false);
		setIsLocked(false);
		setDiaryId(null);
		setLockedAt(null);
		setDiaryHash(null);
		setLastSavedAt(null);
		setRevisionCount(0);

		Promise.all([
			fetch("/api/templates").then((r) => r.json()),
			fetch(`/api/diaries/visit/${visitId}`).then((r) => r.json()),
		])
			.then(([tmplData, diaryData]) => {
				if (!alive) return;
				setTemplates(tmplData.templates ?? []);
				if (diaryData.diary) {
					const d = diaryData.diary;
					setDiary({
						anamnesis: d.anamnesis ?? "",
						statusLocalis: d.statusLocalis ?? "",
						diagnosisIcd10: d.diagnosisIcd10 ?? "",
						diagnosisTooth: d.diagnosisTooth ?? "",
						treatmentDescription: d.treatmentDescription ?? "",
					});
					if (d.instrumentTrayBarcode) setTrayBarcode(d.instrumentTrayBarcode);
					setIsLocked(d.isLocked ?? false);
					setDiaryId(d.id ?? null);
					setLockedAt(d.lockedAt ?? null);
					setDiaryHash(d.diaryHash ?? null);
					if (d.diagnosisIcd10) setIcdSearch(d.diagnosisIcd10);
					if (d.id) {
						fetch(`/api/diaries/${d.id}/revisions`)
							.then((r) => r.json())
							.then((rd) => {
								if (alive) setRevisionCount(rd.revisions?.length ?? 0);
							})
							.catch(() => {});
					}

					// Fetch attachments if supported
					fetch(`/api/files/diary/${d.id}`)
						.then((r) => r.json())
						.then((res) => {
							if (alive && res.files) setAttachments(res.files);
						})
						.catch(() => {});
				}
			})
			.catch(console.error);

		return () => {
			alive = false;
			setDiary(EMPTY_DIARY);
			setSelectedTemplate("");
			setIcdSearch("");
			setShowPreview(false);
			if (autosaveRef.current) clearInterval(autosaveRef.current);
			useVisitStore.getState().setVisitNoteForm(emptyVisitNoteForm);
			useVisitStore.getState().setDraft(null);
		};
	}, [visitId]);

	// ── Resize textareas after state update
	useEffect(() => {
		document
			.querySelectorAll<HTMLTextAreaElement>(".auto-resize-ta")
			.forEach(autoResize);
	}, [diary, isLocked]);

	// ── Click outside ICD dropdown
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (icdRef.current && !icdRef.current.contains(e.target as Node))
				setShowIcdDropdown(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// ── Autosave every 30s when unlocked
	const doSave = useCallback(
		async (silent = false) => {
			if (isLocked) return;
			setIsSaving(true);
			try {
				const res = await fetch("/api/diaries", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						visitId,
						patientId,
						instrumentTrayBarcode: trayBarcode,
						...diary,
					}),
				});
				const json = await res.json();
				if (json.id && !diaryId) setDiaryId(json.id);
				setLastSavedAt(new Date());
				if (!silent) showToast("Дневник сохранён", "success");
			} catch {
				if (!silent) showToast("Ошибка сохранения", "error");
			} finally {
				setIsSaving(false);
			}
		},
		[isLocked, visitId, patientId, diary, diaryId],
	);

	useEffect(() => {
		if (!isLocked) {
			autosaveRef.current = setInterval(() => doSave(true), 30_000);
		}
		return () => {
			if (autosaveRef.current) clearInterval(autosaveRef.current);
		};
	}, [isLocked, doSave]);

	// ── Template application
	const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const tId = e.target.value;
		setSelectedTemplate(tId);
		const t = templates.find((x) => x.id === tId);
		if (t && !isLocked) {
			setDiary((prev) => ({
				...prev,
				anamnesis: t.prefilledAnamnesis ?? "",
				statusLocalis: t.prefilledObjective ?? "",
				diagnosisIcd10: t.defaultIcd10 ?? "",
				treatmentDescription: t.prefilledTreatment ?? "",
			}));
			if (t.defaultIcd10) setIcdSearch(t.defaultIcd10);
			showToast(`Шаблон «${t.title}» применён`, "success");
		}
	};

	// ── ICD-10 select
	const handleIcdSelect = (code: string) => {
		setDiary((prev) => ({ ...prev, diagnosisIcd10: code }));
		setIcdSearch(code);
		setShowIcdDropdown(false);
	};

	const filteredIcd = ICD10_DICTIONARY.filter(
		(i) =>
			i.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
			i.label.toLowerCase().includes(icdSearch.toLowerCase()) ||
			i.group.toLowerCase().includes(icdSearch.toLowerCase()),
	).slice(0, 12);

	// ── Lock (Sign & Seal)
	const handleLock = () => {
		if (!diary.diagnosisIcd10) {
			showToast("Укажите диагноз МКБ-10 перед подписанием!", "error");
			return;
		}
		setShowPinDialog(true);
	};

	const confirmLock = async () => {
		if (!activeDoctor) {
			showToast("Сначала выберите врача для приема!", "error");
			return;
		}

		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");
			const response = await fetch("/api/auth/staff/unlock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
				},
				body: JSON.stringify({
					userId: activeDoctor.id,
					pinCode: pinCode,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				showToast(data.message || "Неверный ПИН-код врача!", "error");
				return;
			}
		} catch (e: any) {
			showToast("Ошибка сети при проверке ПИН-кода", "error");
			return;
		}

		setShowPinDialog(false);
		setPinCode("");
		await doSave(true);

		if (trayBarcode) {
			try {
				const linkRes = await fetch("/api/sterilization/link", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ visitId, barcode: trayBarcode }),
				});
				if (!linkRes.ok) {
					const err = await linkRes.json();
					showToast(
						`Ошибка стерилизации: ${err.error || "Неизвестный штрихкод"}`,
						"error",
					);
					return; // Stop lock if barcode is invalid
				}
			} catch (e) {
				showToast("Сетевая ошибка проверки штрихкода", "error");
				return;
			}
		}

		const target = diaryId ?? visitId;
		try {
			const res = await fetch(`/api/diaries/${target}/lock`, {
				method: "POST",
			});
			const json = await res.json();
			if (res.ok) {
				setIsLocked(true);
				setLockedAt(new Date().toISOString());
				setDiaryHash(json.hash ?? null);
				showToast("Дневник подписан и заблокирован (ЭЦП врача).", "success");
			} else if (res.status === 409) {
				setIsLocked(true);
				showToast("Дневник уже был подписан ранее.", "info");
			} else {
				showToast(`Ошибка: ${json.error ?? "неизвестная"}`, "error");
			}
		} catch {
			showToast("Ошибка сети при подписании", "error");
		}
	};

	// ── WebP Compression & Upload
	const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !diaryId) return;

		setIsUploading(true);
		try {
			const img = new Image();
			const objectUrl = URL.createObjectURL(file);

			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
				img.src = objectUrl;
			});

			const canvas = document.createElement("canvas");
			let width = img.width;
			let height = img.height;

			const MAX_SIZE = 1200;
			if (width > height && width > MAX_SIZE) {
				height *= MAX_SIZE / width;
				width = MAX_SIZE;
			} else if (height > MAX_SIZE) {
				width *= MAX_SIZE / height;
				height = MAX_SIZE;
			}

			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			ctx?.drawImage(img, 0, 0, width, height);

			const compressedBlob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, "image/webp", 0.8),
			);
			URL.revokeObjectURL(objectUrl);

			if (!compressedBlob) throw new Error("Compression failed");

			const formData = new FormData();
			formData.append("file", compressedBlob, "photo.webp");
			formData.append("entityType", "diary");
			formData.append("entityId", diaryId);

			const res = await fetch("/api/files/upload", {
				method: "POST",
				body: formData,
			});
			if (!res.ok) throw new Error("Upload failed");

			const data = await res.json();
			setAttachments((prev) => [...prev, data.file]);
			showToast("Фото сжато в WebP и загружено", "success");
		} catch (err: any) {
			showToast(`Ошибка загрузки: ${err.message}`, "error");
		} finally {
			setIsUploading(false);
			e.target.value = "";
		}
	};

	// ── Category groups for template dropdown
	const templatesByCategory = templates.reduce<Record<string, Template[]>>(
		(acc, t) => {
			const cat = t.category ?? "Прочее";
			(acc[cat] ??= []).push(t);
			return acc;
		},
		{},
	);

	// ── Print preview content
	const icdEntry = ICD10_DICTIONARY.find(
		(i) => i.code === diary.diagnosisIcd10,
	);
	const PrintPreviewContent = (
		<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print-layer">
			<div className="bg-zinc-50/40 text-black w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] print-content">
				<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl no-print">
					<h3 className="font-bold flex items-center gap-2 text-gray-800">
						<Printer className="w-5 h-5" /> Медицинская карта (Форма 043/у)
					</h3>
					<button
						onClick={() => setShowPreview(false)}
						className="text-gray-500 hover:text-black flex items-center gap-1 text-sm"
					>
						<X className="w-4 h-4" /> Закрыть
					</button>
				</div>

				<div className="p-8 overflow-y-auto" id="print-043">
					<div className="text-center mb-6 border-b-2 border-black pb-4">
						<h1 className="text-xl font-bold uppercase">
							Медицинская карта стоматологического больного
						</h1>
						<p className="text-sm text-gray-600">
							Форма № 043/у (Приказ МЗ РФ № 834н)
						</p>
					</div>

					{isLocked && diaryHash && (
						<div
							className="mb-6 mt-4 p-4 bg-green-50 border border-green-300 rounded text-xs text-green-800 font-mono break-all page-break-avoid"
							style={{ clear: "both", display: "block", position: "relative" }}
						>
							<strong>ЭЦП (SHA-256):</strong> {diaryHash}
							<br />
							<strong>Подписан:</strong>{" "}
							{lockedAt ? new Date(lockedAt).toLocaleString("ru-RU") : "—"}
							{revisionCount > 0 && (
								<span className="ml-3 text-orange-700">
									{" "}
									⚠ Ревизий: {revisionCount}
								</span>
							)}
						</div>
					)}

					<div className="space-y-5">
						<div className="page-break-avoid">
							<h4 className="font-bold border-b border-gray-300 mb-2">
								S — Жалобы и анамнез (Subjective)
							</h4>
							<p className="text-sm whitespace-pre-wrap">
								{diary.anamnesis || "—"}
							</p>
						</div>
						<div className="page-break-avoid">
							<h4 className="font-bold border-b border-gray-300 mb-2">
								O — Объективный статус (Status Localis)
							</h4>
							<p className="text-sm whitespace-pre-wrap">
								{diary.statusLocalis || "—"}
							</p>
						</div>
						<div className="page-break-avoid">
							<h4 className="font-bold border-b border-gray-300 mb-2">
								A — Диагноз (Assessment)
							</h4>
							<p className="text-sm">
								<strong>МКБ-10:</strong> {diary.diagnosisIcd10 || "—"}{" "}
								{icdEntry ? `(${icdEntry.label})` : ""}
								{diary.diagnosisTooth
									? ` | Зуб по FDI: ${diary.diagnosisTooth}`
									: ""}
							</p>
						</div>
						<div className="page-break-avoid">
							<h4 className="font-bold border-b border-gray-300 mb-2">
								P — Лечение и план (Plan)
							</h4>
							<p className="text-sm whitespace-pre-wrap">
								{diary.treatmentDescription || "—"}
							</p>
						</div>
					</div>

					<div className="mt-10 pt-6 border-t border-gray-300 flex justify-between text-sm page-break-avoid">
						<div>Подпись врача: ___________________</div>
						<div>Дата: {new Date().toLocaleDateString("ru-RU")}</div>
					</div>
				</div>

				<div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-xl no-print gap-3">
					<button
						onClick={() => setShowPreview(false)}
						className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
					>
						Закрыть
					</button>
					<button
						onClick={() => window.print()}
						className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow flex items-center gap-2 text-sm"
					>
						<Printer className="w-4 h-4" /> Напечатать
					</button>
				</div>
			</div>
		</div>
	);

	return (
		<div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-[0_0_60px_-15px_rgba(16,185,129,0.15)] flex flex-col gap-5 relative overflow-hidden group no-print">
			{/* Glow on hover */}
			<div className="absolute -inset-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-blue-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-1000 pointer-events-none" />

			{/* ── Header ── */}
			<div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
						<Activity className="w-5 h-5 text-emerald-400" />
					</div>
					<div>
						<h2 className="text-lg font-bold text-zinc-100">
							Клинический дневник SOAP
						</h2>
						<div className="flex items-center gap-2 text-xs text-zinc-500">
							{lastSavedAt && (
								<span className="flex items-center gap-1">
									<Clock className="w-3 h-3" />
									Сохранено{" "}
									{lastSavedAt.toLocaleTimeString("ru-RU", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							)}
							{revisionCount > 0 && (
								<span className="text-orange-400 flex items-center gap-1">
									<ShieldCheck className="w-3 h-3" />
									{revisionCount} ревиз.
								</span>
							)}
						</div>
					</div>
				</div>

				{isLocked ? (
					<div className="flex items-center gap-2 flex-shrink-0">
						<button
							id="diary-print-btn"
							onClick={() => setShowPreview(true)}
							className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm border border-zinc-700"
						>
							<Printer className="w-4 h-4" /> Печать 043/у
						</button>
						<span className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-bold">
							<Lock className="w-4 h-4" /> ПОДПИСАНО
						</span>
					</div>
				) : (
					<div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
						<div className="relative w-full sm:w-60">
							<Clipboard className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
							<select
								id="diary-template-select"
								value={selectedTemplate}
								onChange={handleTemplateChange}
								className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700/60 text-zinc-200 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none"
							>
								<option value="">— Клинический шаблон —</option>
								{Object.entries(templatesByCategory).map(([cat, tpls]) => (
									<optgroup key={cat} label={cat}>
										{tpls.map((t) => (
											<option key={t.id} value={t.id}>
												{t.title}
											</option>
										))}
									</optgroup>
								))}
							</select>
						</div>
					</div>
				)}
			</div>

			{/* ── SOAP Fields grid ── */}
			<div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* S — Subjective (Жалобы) */}
				<div className="flex flex-col space-y-1.5 h-full">
					<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
						<Stethoscope className="w-3 h-3 text-blue-400" />
						<span className="text-blue-400 font-mono font-bold">S</span> —
						Жалобы и анамнез
					</label>
					<textarea
						id="diary-anamnesis"
						disabled={isLocked}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta flex-1 w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:ring-1 focus:ring-blue-500/50 outline-none disabled:opacity-50 resize-none transition-all"
						value={diary.anamnesis}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, anamnesis: e.target.value }));
						}}
						onFocus={handleAutoResize}
						placeholder="Со слов пациента: жалобы на боли, чувствительность..."
					/>
				</div>

				{/* O — Objective (Status Localis) */}
				<div className="flex flex-col space-y-1.5 h-full">
					<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
						<Search className="w-3 h-3 text-purple-400" />
						<span className="text-purple-400 font-mono font-bold">O</span> —
						Объективно (Status Localis)
					</label>
					<textarea
						id="diary-status-localis"
						disabled={isLocked}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta flex-1 w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:ring-1 focus:ring-purple-500/50 outline-none disabled:opacity-50 resize-none transition-all"
						value={diary.statusLocalis}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, statusLocalis: e.target.value }));
						}}
						onFocus={handleAutoResize}
						placeholder="Внешний осмотр, перкуссия, пальпация, ЭОД, рентген..."
					/>
				</div>

				{/* A — Assessment (МКБ-10) + FDI Tooth */}
				<div className="lg:col-span-2 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60 space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{/* ICD-10 Search */}
						<div className="sm:col-span-2 space-y-1.5 relative" ref={icdRef}>
							<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
								<span className="text-amber-400 font-mono font-bold">A</span> —
								Диагноз МКБ-10
							</label>
							{diary.diagnosisIcd10 ? (
								<div
									className={`w-full rounded-xl px-4 py-3 text-sm font-medium border flex items-center gap-2 ${getIcdColor(diary.diagnosisIcd10)} transition-all`}
								>
									<span className="font-mono bg-black/20 px-2 py-0.5 rounded text-xs">
										{diary.diagnosisIcd10}
									</span>
									<span className="flex-1 truncate">
										{ICD10_DICTIONARY.find(
											(i) => i.code === diary.diagnosisIcd10,
										)?.label ?? "Диагноз выбран"}
									</span>
									{!isLocked && (
										<button
											onClick={() => {
												setDiary((p) => ({ ...p, diagnosisIcd10: "" }));
												setIcdSearch("");
											}}
											className="ml-auto hover:bg-black/20 p-1 rounded"
											title="Сбросить"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									)}
								</div>
							) : (
								<div className="relative">
									<Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
									<input
										id="diary-icd-search"
										disabled={isLocked}
										className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl pl-9 p-3 text-sm text-zinc-200 focus:ring-2 focus:ring-amber-500/50 outline-none disabled:opacity-50"
										value={icdSearch}
										onChange={(e) => {
											setIcdSearch(e.target.value);
											setShowIcdDropdown(true);
										}}
										onFocus={() => !isLocked && setShowIcdDropdown(true)}
										placeholder="K02.1 Кариес... или введите название"
									/>
									{showIcdDropdown && filteredIcd.length > 0 && (
										<div className="absolute z-30 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
											{filteredIcd.map((icd) => (
												<div
													key={icd.code}
													className="p-3 hover:bg-zinc-700/80 cursor-pointer flex gap-3 items-center border-b border-zinc-700/40 last:border-0"
													onMouseDown={(e) => {
														e.preventDefault();
														handleIcdSelect(icd.code);
													}}
												>
													<span
														className={`px-2 py-0.5 rounded text-xs font-mono border shrink-0 ${ICD_GROUP_COLORS[icd.group] ?? ""}`}
													>
														{icd.code}
													</span>
													<div className="min-w-0">
														<div className="text-sm text-zinc-200 truncate">
															{icd.label}
														</div>
														<div className="text-xs text-zinc-500">
															{icd.group}
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</div>

						{/* FDI Tooth */}
						<div className="space-y-1.5">
							<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold">
								Зуб (FDI)
							</label>
							<input
								id="diary-tooth"
								disabled={isLocked}
								className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-200 focus:ring-2 focus:ring-amber-500/50 outline-none disabled:opacity-50 font-mono text-center"
								value={diary.diagnosisTooth}
								onChange={(e) =>
									setDiary((p) => ({ ...p, diagnosisTooth: e.target.value }))
								}
								placeholder="16, 36..."
								maxLength={8}
							/>
						</div>
					</div>
				</div>

				{/* P — Plan (Treatment) */}
				<div className="space-y-1.5 lg:col-span-2">
					<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
						<FileText className="w-3 h-3 text-emerald-400" />
						<span className="text-emerald-400 font-mono font-bold">P</span> —
						Лечение и рекомендации
					</label>
					<textarea
						id="diary-treatment"
						disabled={isLocked}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:ring-1 focus:ring-emerald-500/50 outline-none disabled:opacity-50 resize-none transition-all"
						value={diary.treatmentDescription}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, treatmentDescription: e.target.value }));
						}}
						onFocus={handleAutoResize}
						placeholder="Анестезия, проведённые манипуляции, рекомендации..."
					/>
				</div>

				{/* Attachments (Photos) */}
				<div className="space-y-1.5 lg:col-span-2">
					<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center justify-between">
						<span className="flex items-center gap-1.5">
							<Camera className="w-3 h-3 text-rose-400" /> Вложения (Фотографии)
						</span>
						{!isLocked && diaryId && (
							<label className="cursor-pointer text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-lg transition-colors border border-zinc-700">
								<Paperclip className="w-3 h-3" />
								{isUploading ? "Сжатие..." : "Прикрепить фото"}
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={handlePhotoUpload}
									disabled={isUploading || isLocked}
								/>
							</label>
						)}
					</label>
					{attachments.length > 0 ? (
						<div className="flex gap-3 overflow-x-auto pb-2">
							{attachments.map((att) => (
								<div key={att.id} className="relative group shrink-0">
									<img
										src={att.url}
										alt={att.name}
										className="h-20 w-20 object-cover rounded-lg border border-zinc-700 shadow-sm"
									/>
									<a
										href={att.url}
										target="_blank"
										rel="noreferrer"
										className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
									>
										<Search className="w-5 h-5 text-white" />
									</a>
								</div>
							))}
						</div>
					) : (
						<div className="w-full bg-zinc-900/60 border border-zinc-800 border-dashed rounded-xl p-4 text-sm text-zinc-500 text-center">
							{diaryId
								? isLocked
									? "Нет прикрепленных фото."
									: "Нажмите «Прикрепить фото», чтобы добавить снимки лечения."
								: "Сначала сохраните дневник, чтобы прикрепить фото."}
						</div>
					)}
				</div>
			</div>

			{/* ── Actions Footer ── */}
			{!isLocked ? (
				<div className="relative flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-zinc-800/60 pt-4">
					<span className="text-xs text-zinc-600 flex items-center gap-1 mr-auto hidden sm:flex">
						<AlertTriangle className="w-3 h-3" /> Автосохранение каждые 30 сек
					</span>
					<button
						onClick={() => setShowScanner(true)}
						className="w-full sm:w-auto px-5 py-2 text-sm text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/30 rounded-xl transition-all flex items-center justify-center gap-2"
					>
						<Activity className="w-4 h-4" />
						{trayBarcode ? `Лоток: ${trayBarcode}` : "Сканировать Лоток"}
					</button>
					<button
						id="diary-save-btn"
						onClick={() => doSave(false)}
						disabled={isSaving}
						className="w-full sm:w-auto px-5 py-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all"
					>
						{isSaving ? "Сохраняю..." : "Сохранить черновик"}
					</button>
					<button
						id="diary-sign-btn"
						onClick={handleLock}
						disabled={isSaving}
						className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
					>
						<CheckCircle2 className="w-4 h-4" />
						ЗАВЕРШИТЬ И ПОДПИСАТЬ
					</button>
				</div>
			) : (
				<div className="border-t border-zinc-800/60 pt-4 flex items-center gap-3 text-xs text-zinc-500">
					<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
					<span>
						Дневник подписан
						{lockedAt ? ` • ${new Date(lockedAt).toLocaleString("ru-RU")}` : ""}
						.
						{diaryHash && (
							<span className="ml-2 font-mono text-zinc-600">
								{diaryHash.slice(0, 16)}…
							</span>
						)}
					</span>
					<button
						onClick={() => setShowPreview(true)}
						className="ml-auto flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
					>
						<Printer className="w-3.5 h-3.5" /> Форма 043/у
					</button>
				</div>
			)}

			{showScanner &&
				createPortal(
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
						<div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative overflow-hidden animate-in zoom-in-95 duration-200">
							{/* The laser line */}
							<div
								className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_20px_10px_rgba(239,68,68,0.6)] z-50 pointer-events-none"
								style={{ animation: "visitScanLaser 2s linear infinite" }}
							/>

							{/* Scanning area border */}
							<div className="absolute inset-0 border-[3px] border-zinc-800 rounded-2xl pointer-events-none m-2" />
							<div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-red-500/70 rounded-tl-xl pointer-events-none" />
							<div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-red-500/70 rounded-tr-xl pointer-events-none" />
							<div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-red-500/70 rounded-bl-xl pointer-events-none" />
							<div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-red-500/70 rounded-br-xl pointer-events-none" />

							<button
								onClick={() => setShowScanner(false)}
								className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
							<h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
								<Activity className="w-5 h-5 text-red-400" />
								Сканер СанПиН
							</h2>
							<p className="text-sm text-zinc-300 mb-6 font-medium">
								Наведите сканер на штрихкод стерильного лотка или введите
								вручную.
							</p>
							<input
								autoFocus
								className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
								placeholder="000000000000"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										const val = e.currentTarget.value.trim();
										if (val) {
											setTrayBarcode(val);
											showToast("Лоток привязан", "success");
											setShowScanner(false);
										}
									}
								}}
							/>
						</div>
					</div>,
					document.body,
				)}

			{/* ── Print CSS ── */}
			<style
				dangerouslySetInnerHTML={{
					__html: `
        @media print {
          body > *:not(.print-layer) { display: none !important; }
          html, body { background: white !important; height: auto !important; overflow: visible !important; }
          .print-layer { display: block !important; position: absolute; left: 0; top: 0; width: 100% !important; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-content { box-shadow: none !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; }
          #print-043 { overflow: visible !important; }
          .page-break-avoid { page-break-inside: avoid; }
        }
        @keyframes visitScanLaser {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `,
				}}
			/>

			{/* ── Portals ── */}
			{showPreview &&
				typeof window !== "undefined" &&
				createPortal(PrintPreviewContent, document.body)}

			{showPinDialog &&
				typeof window !== "undefined" &&
				createPortal(
					<div className="modal-overlay">
						<div className="modal-content">
							<div className="modal-header">
								<h3 className="modal-title">Подписание дневника</h3>
								<p className="modal-subtitle">
									Введите ПИН-код врача для ЭЦП подписания дневника.
								</p>
							</div>
							<div className="modal-body">
								<input
									id="diary-pin-input"
									type="password"
									value={pinCode}
									onChange={(e) => setPinCode(e.target.value)}
									placeholder="Введите ПИН-код врача"
									className="modal-input"
									autoFocus
									onKeyDown={(e) => {
										if (e.key === "Enter") confirmLock();
									}}
								/>
							</div>
							<div className="modal-footer">
								<button
									onClick={() => {
										setShowPinDialog(false);
										setPinCode("");
									}}
									className="modal-btn secondary"
								>
									Отмена
								</button>
								<button
									id="diary-pin-confirm"
									onClick={confirmLock}
									className="modal-btn primary"
								>
									Подтвердить
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
};
