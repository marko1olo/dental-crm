import type React from "react";
import type { ToothIncisorStandHudProps } from "./incisorStandTypes";

function getToothDescription(num: number): { side: string; landmarks: string } {
	switch (num) {
		case 11:
			return {
				side: "Q1 Верхний правый центральный",
				landmarks: "Лопатообразная коронка · Tuberculum dentale · 3 Валика · 1 Конический канал",
			};
		case 21:
			return {
				side: "Q2 Верхний левый центральный",
				landmarks: "Лопатообразная коронка · Tuberculum dentale · Foramen caecum · Зеркальная симметрия",
			};
		case 12:
			return {
				side: "Q1 Верхний правый латеральный",
				landmarks: "Округлый дистальный угол · Слепая ямка · Апикальный изгиб корня",
			};
		case 22:
			return {
				side: "Q2 Верхний левый латеральный",
				landmarks: "Округлый дистальный угол · Palatoradicular groove · Зеркальная симметрия",
			};
		case 31:
			return {
				side: "Q3 Нижний левый центральный",
				landmarks: "Долотообразная коронка · 3 Мамелона · Sulcus longitudinalis · Vertucci II/III",
			};
		case 41:
			return {
				side: "Q4 Нижний правый центральный",
				landmarks: "Сжатый корень · Двусторонняя борозда · Высокая симметрия коронки",
			};
		case 32:
			return {
				side: "Q3 Нижний левый латеральный",
				landmarks: "Дистальный скос режущего края · Веерообразная форма · Sulcus longitudinalis",
			};
		case 42:
			return {
				side: "Q4 Нижний правый латеральный",
				landmarks: "Дистальный скос режущего края · Двусторонняя борозда · Зеркальная симметрия",
			};
		default:
			return { side: "Резцовая группа", landmarks: "Анатомический резец" };
	}
}

export const ToothIncisorStandHud: React.FC<ToothIncisorStandHudProps> = ({
	toothNumber,
	zoom,
	activePresetTitle,
	isDark,
}) => {
	const info = getToothDescription(toothNumber);

	return (
		<div
			data-testid="tooth-incisor-gate2-stand"
			className="stand-hud absolute top-2 left-3 sm:top-3 sm:left-4 text-[10px] sm:text-xs font-mono opacity-80 space-y-0.5 pointer-events-none z-10 text-[var(--ink)]"
		>
			<div className="font-semibold">
				FDI {toothNumber} ({info.side}) · Масштаб {zoom}x ({100 * zoom}×{160 * zoom}px)
			</div>
			<div>Пресет: {activePresetTitle}</div>
			<div className="hidden sm:block opacity-75">
				WCAG: {isDark ? "4.52:1 (AAA OLED)" : "3.33:1 (AA Pure)"} · {info.landmarks}
			</div>
			<div className="sm:hidden opacity-75">
				{info.landmarks.split(" · ").slice(0, 2).join(" · ")}
			</div>
		</div>
	);
};
