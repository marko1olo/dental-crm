import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, CheckCircle2, X, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import {
	type DictationContext,
	dictationComplexHint,
	dictationEmptyHint,
	dictationFailureText,
	isDictationResultEmpty,
	serverParsesDictation,
} from "./lib/panelStateText";
import { logger } from "./utils/logger";

/**
 * SmartParsePreview.tsx — Компонент предпросмотра результатов голосового ввода
 * и клинического разбора речи за креслом врача (MANDATES 8e, 8l, 8y).
 *
 * Инварианты чистоты клинического интерфейса:
 * 1. Никакого технического дев-жаргона (.env, LLM-парсинг, промпты в font-mono).
 * 2. Живой русский язык врача и администратора без англицизмов («Отмена записи», «Новая услуга»).
 * 3. Отсутствие слепящих белых пятен в Dark Mode: все плашки согласованы в обеих темах.
 * 4. Ошибка сервера и честная пустота не сливаются на одном экране.
 * 5. Кнопка «Применить» не блокируется из-за опциональных полей (Мандат 8e).
 */
export type SmartParsedPayload = {
	isAiTask?: boolean;
	prompt?: string;
	serviceName?: string;
	price?: number | null;
	category?: string;
	patientId?: string;
	patientName?: string;
	doctorUserId?: string;
	startsAt?: string;
	timeStr?: string;
	dateStr?: string;
	reason?: string;
	service?: string;
	comment?: string;
	note?: string;
	fullName?: string;
	phone?: string;
	birthDate?: string;
	notes?: string;
	action?: string;
	toothUpdates?: Array<{ code?: string; state?: string }>;
	emkUpdates?: Record<string, unknown>;
	[key: string]: unknown;
};

export interface SmartParsePreviewProps {
	isVisible: boolean;
	parsedData: SmartParsedPayload | null;
	rawText: string;
	type: DictationContext;
	onApply: (data: SmartParsedPayload) => void;
	onManual: () => void;
	onClose: () => void;
}

export function SmartParsePreview({
	isVisible,
	parsedData,
	rawText,
	type,
	onApply,
	onManual,
	onClose,
}: SmartParsePreviewProps) {
	const { auth } = useAppLogicContext();
	const [internalData, setInternalData] = useState<SmartParsedPayload | null>(
		null,
	);
	const [isAiLoading, setIsAiLoading] = useState(false);
	const [aiError, setAiError] = useState<string | null>(null);

	useEffect(() => {
		if (isVisible) {
			setInternalData(parsedData);
			setIsAiLoading(false);
			setAiError(null);
		}
	}, [isVisible, parsedData]);

	const handleAiParse = async () => {
		if (!serverParsesDictation(type)) return;
		setIsAiLoading(true);
		setAiError(null);
		try {
			const response = await fetch("/api/ai/parse-dictation", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ text: rawText, type }),
			});
			if (!response.ok) {
				logger.error(
					`[SmartParsePreview] /api/ai/parse-dictation ответил ${response.status}`,
				);
				setAiError(dictationFailureText(response.status));
				return;
			}
			const data = await response.json();
			setInternalData(data);
		} catch (err: unknown) {
			logger.error("[SmartParsePreview] /api/ai/parse-dictation", err);
			setAiError(dictationFailureText(null));
		} finally {
			setIsAiLoading(false);
		}
	};

	const formatTime = (iso: string) => {
		if (!iso) return "";
		try {
			const d = new Date(iso);
			return d.toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return iso;
		}
	};

	const formatDate = (iso: string) => {
		if (!iso) return "";
		try {
			const d = new Date(iso);
			return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
		} catch {
			return iso;
		}
	};

	const renderComplexNotice = () => (
		<div className="space-y-2 text-sm">
			<div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
				<span className="bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 p-2 rounded-lg text-xs font-semibold uppercase mb-2 border border-teal-200 dark:border-teal-800 flex items-center gap-1.5">
					<Zap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					Требуется клинический разбор
				</span>
				<p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-2">
					{dictationComplexHint(type)}
				</p>
				{rawText && (
					<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
						<span className="text-slate-400 dark:text-slate-500 block text-[11px] font-medium mb-1">
							Надиктованный текст:
						</span>
						<span className="italic">«{rawText}»</span>
					</div>
				)}
			</div>
		</div>
	);

	const renderSchedulePreview = (data: SmartParsedPayload | null) => {
		if (data?.isAiTask) return renderComplexNotice();
		if (!data || Object.keys(data).length === 0) {
			return (
				<div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
					{dictationEmptyHint("schedule")}
				</div>
			);
		}
		return (
			<div className="space-y-2 text-sm">
				{data.action === "cancel" && (
					<div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-2 rounded-lg text-xs font-semibold flex justify-between items-center">
						ОТМЕНА ЗАПИСИ
						<span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">
							Отмена записи
						</span>
					</div>
				)}
				{data.action === "reschedule" && (
					<div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 p-2 rounded-lg text-xs font-semibold flex justify-between items-center">
						ПЕРЕНОС ЗАПИСИ
						<span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px]">
							Перенос записи
						</span>
					</div>
				)}
				{data.patientId && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Пациент:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">Найдено в базе ✓</span>
					</div>
				)}
				{data.patientName && !data.patientId && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Пациент:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">
							{data.patientName}
						</span>
					</div>
				)}
				{data.doctorUserId && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Врач:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">Найден в базе ✓</span>
					</div>
				)}
				{data.startsAt && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Время:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">
							{formatDate(data.startsAt)} в {formatTime(data.startsAt)}
						</span>
					</div>
				)}
				{data.timeStr && !data.startsAt && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Время:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">
							{data.dateStr ? `${data.dateStr} в ` : ""}{data.timeStr}
						</span>
					</div>
				)}
				{(data.reason || data.service) && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Услуга:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">
							{data.reason || data.service}
						</span>
					</div>
				)}
				{(data.comment || data.note) && (
					<div className="flex flex-col pt-1">
						<span className="text-slate-500 dark:text-slate-400 text-xs mb-1">Заметка:</span>
						<span className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg text-amber-900 dark:text-amber-200 italic text-xs">
							{data.comment || data.note}
						</span>
					</div>
				)}
			</div>
		);
	};

	const renderPricesPreview = (data: SmartParsedPayload | null) => {
		if (data?.isAiTask) return renderComplexNotice();
		if (!data?.serviceName) {
			return (
				<div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
					{dictationEmptyHint("prices")}
				</div>
			);
		}
		return (
			<div className="space-y-2 text-sm">
				<div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-2 rounded-lg text-xs font-semibold flex justify-between items-center mb-2">
					ДОБАВИТЬ В ПРАЙС-ЛИСТ
					<span className="bg-emerald-600 dark:bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px]">
						Новая услуга
					</span>
				</div>
				<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
					<span className="text-slate-500 dark:text-slate-400">Услуга:</span>
					<span className="font-medium text-slate-800 dark:text-slate-200">{data.serviceName}</span>
				</div>
				{data.price !== null && data.price !== undefined && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Цена:</span>
						<span className="font-bold text-emerald-600 dark:text-emerald-400">{data.price} ₽</span>
					</div>
				)}
				{data.category && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Категория:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
							{data.category}
						</span>
					</div>
				)}
			</div>
		);
	};

	const renderPatientPreview = (data: SmartParsedPayload | null) => {
		if (data?.isAiTask) return renderComplexNotice();
		if (!data || Object.keys(data).length === 0) {
			return (
				<div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
					{dictationEmptyHint("patient")}
				</div>
			);
		}
		return (
			<div className="space-y-2 text-sm">
				{data.fullName && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">ФИО:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">{data.fullName}</span>
					</div>
				)}
				{data.phone && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Телефон:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">{data.phone}</span>
					</div>
				)}
				{data.birthDate && (
					<div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
						<span className="text-slate-500 dark:text-slate-400">Дата рождения:</span>
						<span className="font-medium text-slate-800 dark:text-slate-200">{data.birthDate}</span>
					</div>
				)}
				{data.notes && (
					<div className="flex flex-col pt-1">
						<span className="text-slate-500 dark:text-slate-400 text-xs mb-1">Заметки:</span>
						<span className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg text-amber-900 dark:text-amber-200 italic text-xs">
							{data.notes}
						</span>
					</div>
				)}
			</div>
		);
	};

	const renderVisitPreview = (data: SmartParsedPayload | null) => {
		if (data?.isAiTask) return renderComplexNotice();
		if (
			!data ||
			(!data.toothUpdates?.length && !Object.keys(data.emkUpdates || {}).length)
		) {
			return (
				<div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
					{dictationEmptyHint("visit")}
				</div>
			);
		}
		return (
			<div className="space-y-2 text-sm max-h-[300px] overflow-y-auto pr-2">
				{data.toothUpdates && data.toothUpdates.length > 0 && (
					<div className="mb-2">
						<span className="text-slate-500 dark:text-slate-400 block mb-1">Зубы:</span>
						<div className="flex flex-wrap gap-1">
							{data.toothUpdates.map(
								(t: { code?: string; state?: string }, toothIndex: number) => (
									<span
										key={
											t.code
												? `tooth-${t.code}`
												: `tooth-${t.state || "update"}-${toothIndex}`
										}
										className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs border border-blue-100 dark:border-blue-900"
									>
										{t.code}: {t.state}
									</span>
								),
							)}
						</div>
					</div>
				)}
				{!!data.emkUpdates &&
					Object.entries(data.emkUpdates).map(([k, v]) => {
						if (!v) return null;
						let label = k;
						if (k === "complaint") label = "Жалобы";
						if (k === "anamnesis") label = "Анамнез";
						if (k === "objectiveStatus") label = "Объективно";
						if (k === "diagnosis") label = "Диагноз";
						if (k === "treatmentPlan") label = "Лечение";

						return (
							<div
								key={k}
								className="flex flex-col border-t border-slate-100 dark:border-slate-800 pt-1 mt-1"
							>
								<span className="text-slate-500 dark:text-slate-400 text-xs mb-1">{label}:</span>
								<span className="font-medium text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap">
									{v as string}
								</span>
							</div>
						);
					})}
			</div>
		);
	};

	const renderContent = () => {
		if (isAiLoading) {
			return (
				<div className="flex flex-col items-center justify-center p-6 space-y-3">
					<div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
					<p className="text-sm text-teal-700 dark:text-teal-300 font-medium">
						Разбираем надиктованное…
					</p>
				</div>
			);
		}

		if (aiError && isDictationResultEmpty(type, internalData)) {
			return null;
		}

		switch (type) {
			case "schedule":
				return renderSchedulePreview(internalData);
			case "patient":
				return renderPatientPreview(internalData);
			case "visit":
				return renderVisitPreview(internalData);
			case "prices":
				return renderPricesPreview(internalData);
			default:
				logger.error(
					`[SmartParsePreview] неизвестный контекст диктовки: ${type}`,
				);
				return (
					<div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
						Здесь диктовка пока не поддерживается. Заполните поля вручную или выберите из каталога.
					</div>
				);
		}
	};

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					className="absolute left-0 top-full mt-2 w-[400px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
				>
					<div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 p-3 flex justify-between items-center">
						<h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-emerald-500" />
							Результат распознавания
						</h4>
						<button
							type="button"
							onClick={onClose}
							className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					<div className="p-4">
						{aiError && (
							<div className="bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 p-2.5 rounded-lg mb-3 text-xs flex items-start gap-2 border border-red-200 dark:border-red-800">
								<AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
								<span>{aiError}</span>
							</div>
						)}
						{renderContent()}
					</div>

					<div className="bg-slate-50 dark:bg-slate-800/80 p-3 border-t border-slate-100 dark:border-slate-700/60 flex gap-2">
						<button
							type="button"
							onClick={() =>
								internalData && onApply(internalData as SmartParsedPayload)
							}
							disabled={isAiLoading || !internalData}
							className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm py-2 px-3 rounded-lg transition-colors flex justify-center items-center gap-1.5 shadow-sm"
						>
							<Check className="w-4 h-4" />
							Применить
						</button>
						{serverParsesDictation(type) && (
							<button
								type="button"
								onClick={handleAiParse}
								disabled={isAiLoading}
								className="flex-1 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 dark:text-teal-300 text-teal-700 font-medium text-sm py-2 px-3 rounded-lg transition-colors flex justify-center items-center gap-1.5 border border-teal-200 dark:border-teal-800"
							>
								<Zap className="w-4 h-4" />
								ИИ-Анализ
							</button>
						)}
						<button
							type="button"
							onClick={onManual}
							disabled={isAiLoading}
							className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-medium text-sm py-2 px-3 rounded-lg transition-colors"
						>
							Вручную
						</button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
