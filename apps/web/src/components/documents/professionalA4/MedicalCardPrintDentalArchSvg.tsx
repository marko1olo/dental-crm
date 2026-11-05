/**
 * apps/web/src/components/documents/professionalA4/MedicalCardPrintDentalArchSvg.tsx
 *
 * Чистый векторный бланк одонтограммы для печати A4 медицинской карты приёма.
 * Две анатомические дуги по 16 зубов (18–28 верхняя челюсть, 48–38 нижняя челюсть).
 * Черные векторные линии 1px для лазерного принтера (@media print).
 * Стандартные клинические индексы: C, P, Pt, R, П, К, И, O.
 * Mandate 8b <= 200 lines.
 */

import React from "react";

export interface MedicalCardPrintDentalArchSvgProps {
	readonly formulaMap?: Record<number, { state?: string; statusCode?: string }> | undefined;
	readonly title?: string | undefined;
	readonly className?: string | undefined;
}

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

function resolveClinicalIndex(rawState?: string): { code: string; isMissing: boolean; isFilled: boolean; isCrown: boolean; isImplant: boolean } {
	if (!rawState) return { code: "—", isMissing: false, isFilled: false, isCrown: false, isImplant: false };
	const s = rawState.trim();
	const lower = s.toLowerCase();

	if (lower === "missing" || lower === "extracted" || lower === "extracted_absent" || lower === "o" || lower === "0" || lower === "отс") {
		return { code: "O", isMissing: true, isFilled: false, isCrown: false, isImplant: false };
	}
	if (lower === "implant" || lower === "planned_implant" || lower === "и" || lower === "импл") {
		return { code: "И", isMissing: false, isFilled: false, isCrown: false, isImplant: true };
	}
	if (lower.startsWith("crown") || lower === "к" || lower === "кд" || lower === "artificial_crown") {
		return { code: "К", isMissing: false, isFilled: false, isCrown: true, isImplant: false };
	}
	if (lower === "filled" || lower === "filled_satisfactory" || lower === "п" || lower === "pl" || lower === "done") {
		return { code: "П", isMissing: false, isFilled: true, isCrown: false, isImplant: false };
	}
	if (lower === "caries" || lower === "c" || lower.startsWith("c0") || lower.startsWith("c1") || lower.startsWith("c2") || lower.startsWith("c3")) {
		return { code: "C", isMissing: false, isFilled: false, isCrown: false, isImplant: false };
	}
	if (lower === "pulpitis" || lower === "p" || lower === "pch") {
		return { code: "P", isMissing: false, isFilled: false, isCrown: false, isImplant: false };
	}
	if (lower === "periodontitis" || lower === "pt" || lower === "ptch") {
		return { code: "Pt", isMissing: false, isFilled: false, isCrown: false, isImplant: false };
	}
	if (lower === "root" || lower === "radix" || lower === "r" || lower === "корень") {
		return { code: "R", isMissing: false, isFilled: false, isCrown: false, isImplant: false };
	}
	if (lower === "healthy" || lower === "norm" || lower === "здоров") {
		return { code: "—", isMissing: false, isFilled: false, isCrown: false, isImplant: false };
	}
	return { code: s, isMissing: false, isFilled: false, isCrown: false, isImplant: false };
}

export const MedicalCardPrintDentalArchSvg: React.FC<MedicalCardPrintDentalArchSvgProps> = React.memo(({
	formulaMap,
	title = "Анатомическая формула зубных рядов (FDI 11–48) · Векторный бланк для печати",
	className = "",
}) => {
	const renderToothBox = (num: number, x: number, isUpper: boolean) => {
		const rec = formulaMap?.[num];
		const stateStr = rec?.state || rec?.statusCode;
		const { code, isMissing, isCrown, isImplant } = resolveClinicalIndex(stateStr);
		const yCrown = isUpper ? 36 : 94;
		const yRoot = isUpper ? 8 : 138;
		const yText = isUpper ? 66 : 88;
		const yIndex = isUpper ? 48 : 106;

		return (
			<g key={num} className="a4-print-tooth-cell">
				{/* Контур корня зуба (черная линия 1px) */}
				{!isMissing && !isImplant && (
					<path
						d={
							isUpper
								? `M ${x + 6} ${yCrown} C ${x + 8} ${yRoot + 14}, ${x + 12} ${yRoot + 4}, ${x + 16} ${yRoot} C ${x + 20} ${yRoot + 4}, ${x + 24} ${yRoot + 14}, ${x + 26} ${yCrown}`
								: `M ${x + 6} ${yCrown + 26} C ${x + 8} ${yRoot - 14}, ${x + 12} ${yRoot - 4}, ${x + 16} ${yRoot} C ${x + 20} ${yRoot - 4}, ${x + 24} ${yRoot - 14}, ${x + 26} ${yCrown + 26}`
						}
						fill="none"
						stroke="#000000"
						strokeWidth="1"
						vectorEffect="non-scaling-stroke"
					/>
				)}

				{/* Контур резьбы импланта при наличии */}
				{isImplant && (
					<g stroke="#000000" strokeWidth="1" fill="none">
						<line x1={x + 10} y1={yRoot + 4} x2={x + 22} y2={yRoot + 4} />
						<line x1={x + 9} y1={yRoot + 8} x2={x + 23} y2={yRoot + 8} />
						<line x1={x + 8} y1={yRoot + 12} x2={x + 24} y2={yRoot + 12} />
					</g>
				)}

				{/* Контур анатомической коронки зуба */}
				<rect
					x={x + 3}
					y={yCrown}
					width={26}
					height={24}
					rx={3}
					fill={isCrown ? "#f1f5f9" : "#ffffff"}
					stroke="#000000"
					strokeWidth={isCrown ? 1.5 : 1}
					vectorEffect="non-scaling-stroke"
				/>

				{/* Контурная штриховка / крест при удаленном зубе */}
				{isMissing && (
					<g stroke="#000000" strokeWidth="1.2">
						<line x1={x + 3} y1={yCrown} x2={x + 29} y2={yCrown + 24} />
						<line x1={x + 29} y1={yCrown} x2={x + 3} y2={yCrown + 24} />
					</g>
				)}

				{/* Номер зуба FDI */}
				<text
					x={x + 16}
					y={yText}
					textAnchor="middle"
					fontSize="8.5"
					fontWeight="bold"
					fontFamily="system-ui, -apple-system, sans-serif"
					fill="#000000"
				>
					{num}
				</text>

				{/* Клинический индекс (C, P, Pt, R, П, К, И, O) */}
				<text
					x={x + 16}
					y={yIndex}
					textAnchor="middle"
					fontSize="9"
					fontWeight="900"
					fontFamily="system-ui, -apple-system, sans-serif"
					fill="#000000"
				>
					{code}
				</text>
			</g>
		);
	};

	const startX = 20;
	const toothStep = 45;

	return (
		<div className={`medical-card-print-arch-svg-container w-full my-2 text-center ${className}`}>
			{title && (
				<div style={{ fontSize: "7.5pt", fontWeight: "bold", marginBottom: "3px", color: "#000000" }}>
					{title}
				</div>
			)}
			<svg
				viewBox="0 0 760 160"
				className="w-full h-auto select-none"
				style={{ maxWidth: "100%", height: "auto", display: "block", margin: "0 auto" }}
			>
				{/* Фоновая плашка и разделители челюстей */}
				<rect x={10} y={4} width={740} height={152} fill="#ffffff" stroke="#000000" strokeWidth="1" />

				{/* Сагиттальная линия по центру (Midline) */}
				<line x1={380} y1={4} x2={380} y2={156} stroke="#000000" strokeWidth="1.2" strokeDasharray="3 2" />

				{/* Окклюзионная горизонтальная линия */}
				<line x1={10} y1={80} x2={750} y2={80} stroke="#000000" strokeWidth="1.2" />

				{/* Подписи сторон */}
				<text x={24} y={78} fontSize="7" fontWeight="bold" fill="#000000">ПРАВО (R)</text>
				<text x={700} y={78} fontSize="7" fontWeight="bold" fill="#000000">ЛЕВО (L)</text>
				<text x={380} y={15} fontSize="7.5" fontWeight="bold" textAnchor="middle" fill="#000000">Верхняя челюсть (Maxilla)</text>
				<text x={380} y={152} fontSize="7.5" fontWeight="bold" textAnchor="middle" fill="#000000">Нижняя челюсть (Mandible)</text>

				{/* Верхняя дуга (16 зубов: 18..11, 21..28) */}
				{UPPER_TEETH.map((num, i) => {
					const offsetX = i < 8 ? startX + i * toothStep : startX + i * toothStep + 10;
					return renderToothBox(num, offsetX, true);
				})}

				{/* Нижняя дуга (16 зубов: 48..41, 31..38) */}
				{LOWER_TEETH.map((num, i) => {
					const offsetX = i < 8 ? startX + i * toothStep : startX + i * toothStep + 10;
					return renderToothBox(num, offsetX, false);
				})}
			</svg>
			<div style={{ fontSize: "7pt", color: "#333333", marginTop: "2px", textAlign: "center" }}>
				<strong>Клинические индексы:</strong> C — кариес, P — пульпит, Pt — периодонтит, R — корень, П — пломба, К — коронка, И — имплантат, O — отсутствует, — — интактный
			</div>
		</div>
	);
});

MedicalCardPrintDentalArchSvg.displayName = "MedicalCardPrintDentalArchSvg";
