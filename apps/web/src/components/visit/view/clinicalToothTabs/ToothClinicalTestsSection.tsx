import React, { useState } from "react";
import {
	Activity,
	Check,
	ChevronDown,
	ChevronUp,
	FileText,
	Sparkles,
	Thermometer,
	Zap,
} from "lucide-react";
import { showToast } from "../../../GlobalToast";
import type { ToothClinicalTestsState } from "./types";

export interface ToothClinicalTestsSectionProps {
	code: string;
	appendToEMKField: (field: string, text: string) => void;
}

export function ToothClinicalTestsSection({
	code,
	appendToEMKField,
}: ToothClinicalTestsSectionProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [tests, setTests] = useState<ToothClinicalTestsState>({
		eodMicroAmperes: null,
		percussion: null,
		coldTest: null,
		pocketDepthMm: null,
		mobilityGrade: null,
		palpation: null,
	});

	const handleSetNorm = () => {
		setTests({
			eodMicroAmperes: 4,
			percussion: "negative",
			coldTest: "norm",
			pocketDepthMm: 2,
			mobilityGrade: "0",
			palpation: "painless",
		});
		showToast(`Тесты для зуба ${code}: установлены нормальные показатели`, "info", 2000);
	};

	const handleSaveToEMK = () => {
		const currentTests: ToothClinicalTestsState = hasAnyTest
			? tests
			: {
					eodMicroAmperes: 4,
					percussion: "negative",
					coldTest: "norm",
					pocketDepthMm: 2,
					mobilityGrade: "0",
					palpation: "painless",
			  };

		if (!hasAnyTest) {
			setTests(currentTests);
		}

		const parts: string[] = [`Зуб ${code} (клинические тесты):`];

		if (currentTests.percussion === "negative") parts.push("перкуссия отриц.");
		else if (currentTests.percussion === "positive_vertical") parts.push("перкуссия резкая вертик.");
		else if (currentTests.percussion === "positive_horizontal") parts.push("перкуссия болезненная горизонт.");

		if (currentTests.coldTest === "norm") parts.push("термопроба норма (кратковременная)");
		else if (currentTests.coldTest === "hypersensitive") parts.push("термопроба резко положительная");
		else if (currentTests.coldTest === "delayed_pain") parts.push("термопроба длительная ноющая");
		else if (currentTests.coldTest === "negative") parts.push("термопроба отрицательная (нет реакции)");

		if (currentTests.eodMicroAmperes != null) parts.push(`ЭОД ${currentTests.eodMicroAmperes} мкА`);
		if (currentTests.pocketDepthMm != null) parts.push(`зубодесневой карман ${currentTests.pocketDepthMm} мм`);
		if (currentTests.mobilityGrade != null) parts.push(`подвижность ${currentTests.mobilityGrade} ст.`);
		if (currentTests.palpation === "painless") parts.push("пальпация по переходной складке безболезненная");
		else if (currentTests.palpation === "painful") parts.push("пальпация переходной складки болезненная");

		const textToAppend = parts.join(" ");
		appendToEMKField("objectiveStatus", textToAppend);
		showToast(
			hasAnyTest
				? `Результаты тестов зуба ${code} добавлены в статус осмотра ЭМК`
				: `Зуб ${code}: установлена физиологическая норма тестов и записана в ЭМК`,
			"success",
			2500,
		);
	};

	const hasAnyTest =
		tests.eodMicroAmperes != null ||
		tests.percussion != null ||
		tests.coldTest != null ||
		tests.pocketDepthMm != null ||
		tests.mobilityGrade != null ||
		tests.palpation != null;

	return (
		<div className="_ccm-tests-section mb-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
			<div
				className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-[var(--paper)] transition-colors"
				onClick={() => setIsOpen(!isOpen)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setIsOpen(!isOpen);
					}
				}}
				role="button"
				tabIndex={0}
				aria-expanded={isOpen}
				aria-label={`Клинические тесты зуба ${code}`}
			>
				<div className="flex items-center gap-2">
					<Activity className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span className="text-xs font-semibold text-[var(--text-strong)]">
						Клинические тесты & Диагностика (ЭОД, перкуссия, карманы)
					</span>
					{hasAnyTest && (
						<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--teal-subtle)] text-[var(--teal)] font-medium">
							Заполнено
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5">
					{isOpen ? (
						<ChevronUp className="w-4 h-4 text-[var(--muted)]" />
					) : (
						<ChevronDown className="w-4 h-4 text-[var(--muted)]" />
					)}
				</div>
			</div>

			{isOpen && (
				<div className="p-2.5 pt-0 border-t border-[var(--line-subtle)] space-y-2.5 text-xs">
					{/* Быстрые действия: норма в 1 клик и отправка в ЭМК */}
					<div className="flex items-center gap-2 pt-2">
						<button
							type="button"
							onClick={handleSetNorm}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line-strong,var(--line))] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--text)] text-xs font-semibold transition-colors shadow-2xs"
						>
							<Check className="w-3.5 h-3.5 text-emerald-500" />
							<span>✓ Норма</span>
						</button>
						<button
							type="button"
							onClick={handleSaveToEMK}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ml-auto bg-[var(--teal)] text-white hover:opacity-90 shadow-2xs cursor-pointer"
						>
							<FileText className="w-3.5 h-3.5" />
							<span>Записать в дневник ЭМК</span>
						</button>
					</div>

					{/* 1. Перкуссия */}
					<div>
						<div className="text-[11px] font-medium text-[var(--muted)] mb-1">
							Перкуссия (вертикальная / горизонтальная):
						</div>
						<div className="grid grid-cols-3 gap-1.5">
							{[
								{ id: "negative", label: "Отрицательная (норма)" },
								{ id: "positive_vertical", label: "Болезненная вертик." },
								{ id: "positive_horizontal", label: "Болезненная горизонт." },
							].map((opt) => (
								<button
									key={opt.id}
									type="button"
									onClick={() =>
										setTests((prev) => ({
											...prev,
											percussion: prev.percussion === opt.id ? null : (opt.id as any),
										}))
									}
									className={`py-1.5 px-2 rounded border text-center transition-colors text-[11px] ${
										tests.percussion === opt.id
											? "bg-[var(--teal)] text-white border-[var(--teal)] font-medium"
											: "bg-[var(--paper)] text-[var(--text)] border-[var(--line)] hover:border-[var(--line-strong)]"
									}`}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>

					{/* 2. Термопроба & ЭОД */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<div className="text-[11px] font-medium text-[var(--muted)] mb-1 flex items-center gap-1">
								<Thermometer className="w-3 h-3 text-[var(--teal)]" />
								<span>Холодовая / Термопроба:</span>
							</div>
							<div className="grid grid-cols-2 gap-1">
								{[
									{ id: "norm", label: "Норма" },
									{ id: "hypersensitive", label: "Резкая" },
									{ id: "delayed_pain", label: "Ноющая" },
									{ id: "negative", label: "Нет реакции" },
								].map((opt) => (
									<button
										key={opt.id}
										type="button"
										onClick={() =>
											setTests((prev) => ({
												...prev,
												coldTest: prev.coldTest === opt.id ? null : (opt.id as any),
											}))
										}
										className={`py-1 px-1.5 rounded border text-center text-[10px] ${
											tests.coldTest === opt.id
												? "bg-[var(--teal)] text-white border-[var(--teal)] font-medium"
												: "bg-[var(--paper)] text-[var(--text)] border-[var(--line)]"
										}`}
									>
										{opt.label}
									</button>
								))}
							</div>
						</div>

						<div>
							<div className="text-[11px] font-medium text-[var(--muted)] mb-1 flex items-center gap-1">
								<Zap className="w-3 h-3 text-amber-500" />
								<span>ЭОД (мкА):</span>
							</div>
							<div className="grid grid-cols-3 gap-1">
								{[
									{ val: 4, label: "2-6 (Норма)" },
									{ val: 30, label: "20-40 (Пульпит)" },
									{ val: 100, label: ">100 (Некроз)" },
								].map((item) => (
									<button
										key={item.val}
										type="button"
										onClick={() =>
											setTests((prev) => ({
												...prev,
												eodMicroAmperes: prev.eodMicroAmperes === item.val ? null : item.val,
											}))
										}
										className={`py-1 px-1 rounded border text-center text-[10px] ${
											tests.eodMicroAmperes === item.val
												? "bg-[var(--teal)] text-white border-[var(--teal)] font-medium"
												: "bg-[var(--paper)] text-[var(--text)] border-[var(--line)]"
										}`}
									>
										{item.label}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* 3. Пародонтальный карман & Подвижность */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<div className="text-[11px] font-medium text-[var(--muted)] mb-1">
								Пародонтальный карман (мм):
							</div>
							<div className="grid grid-cols-3 gap-1">
								{[
									{ val: 2, label: "2 мм (Норма)" },
									{ val: 4, label: "3-5 мм" },
									{ val: 7, label: ">6 мм" },
								].map((item) => (
									<button
										key={item.val}
										type="button"
										onClick={() =>
											setTests((prev) => ({
												...prev,
												pocketDepthMm: prev.pocketDepthMm === item.val ? null : item.val,
											}))
										}
										className={`py-1 px-1 rounded border text-center text-[10px] ${
											tests.pocketDepthMm === item.val
												? "bg-[var(--teal)] text-white border-[var(--teal)] font-medium"
												: "bg-[var(--paper)] text-[var(--text)] border-[var(--line)]"
										}`}
									>
										{item.label}
									</button>
								))}
							</div>
						</div>

						<div>
							<div className="text-[11px] font-medium text-[var(--muted)] mb-1">
								Подвижность зуба:
							</div>
							<div className="grid grid-cols-4 gap-1">
								{[
									{ id: "0", label: "0" },
									{ id: "I", label: "I ст." },
									{ id: "II", label: "II ст." },
									{ id: "III", label: "III ст." },
								].map((item) => (
									<button
										key={item.id}
										type="button"
										onClick={() =>
											setTests((prev) => ({
												...prev,
												mobilityGrade: prev.mobilityGrade === item.id ? null : (item.id as any),
											}))
										}
										className={`py-1 px-1 rounded border text-center text-[10px] ${
											tests.mobilityGrade === item.id
												? "bg-[var(--teal)] text-white border-[var(--teal)] font-medium"
												: "bg-[var(--paper)] text-[var(--text)] border-[var(--line)]"
										}`}
									>
										{item.label}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
