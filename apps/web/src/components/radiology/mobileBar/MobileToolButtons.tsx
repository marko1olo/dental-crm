import React from "react";
import { Contrast, Layers, Move, Ruler, Search, Sliders, Trash2 } from "lucide-react";

const baseBtnStyle = (active: boolean): React.CSSProperties => ({
	minWidth: "46px", minHeight: "46px", width: "46px", height: "46px",
	backgroundColor: active ? "rgba(19, 78, 74, 0.95)" : "rgba(255, 255, 255, 0.05)",
	color: active ? "#2dd4bf" : "#94a3b8",
	border: active ? "1px solid rgba(45, 212, 191, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
});

export function MobileToolPanButton({ active, onSelect }: { active: boolean; onSelect: () => void }) {
	return (
		<button type="button" data-testid="mobile-btn-tool-pan" onClick={onSelect} className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer" style={baseBtnStyle(active)} title="Панорамирование (Рука)" aria-label="Панорамирование снимка" aria-pressed={active}>
			<Move size={19} />
			<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Рука</span>
		</button>
	);
}

export function MobileToolRulerButton({ active, count, onSelect }: { active: boolean; count: number; onSelect: () => void }) {
	return (
		<button type="button" data-testid="mobile-btn-tool-ruler" onClick={onSelect} className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer relative" style={baseBtnStyle(active)} title="Линейка (мм)" aria-label="Измерение расстояний в миллиметрах" aria-pressed={active}>
			<Ruler size={19} />
			<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Линейка</span>
			{count > 0 && <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#00C853] text-[#022c15]" title={`Измерений: ${count}`}>{count}</span>}
		</button>
	);
}

export function MobileToolMagnifierButton({ active, onSelect }: { active: boolean; onSelect: () => void }) {
	return (
		<button type="button" data-testid="mobile-btn-tool-magnifier" onClick={onSelect} className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer" style={baseBtnStyle(active)} title="Лупа 2.5x для микротрещин и апекса" aria-label="Интерактивная лупа 2.5x" aria-pressed={active}>
			<Search size={19} />
			<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Лупа 2.5x</span>
		</button>
	);
}

export function MobileToolInvertButton({ invert, onToggle }: { invert: boolean; onToggle: () => void }) {
	return (
		<button type="button" data-testid="mobile-btn-tool-invert" onClick={onToggle} className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer" style={{ minWidth: "46px", minHeight: "46px", width: "46px", height: "46px", backgroundColor: invert ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.05)", color: invert ? "#34d399" : "#94a3b8", border: invert ? "1px solid rgba(52, 211, 153, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)" }} title="Инверсия (Негатив / Позитив)" aria-label="Инвертировать снимок в негатив" aria-pressed={invert}>
			<Contrast size={19} />
			<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Негатив</span>
		</button>
	);
}

export function MobileToolWlButton({ isOpen, hasFilters, onOpen }: { isOpen: boolean; hasFilters: boolean; onOpen: () => void }) {
	const active = isOpen || hasFilters;
	return (
		<button type="button" data-testid="mobile-btn-tool-wl" onClick={onOpen} className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer" style={baseBtnStyle(active)} title="Яркость и контрастность (W/L)" aria-label="Панель яркости и контрастности" aria-expanded={isOpen}>
			<Sliders size={19} />
			<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>W / L</span>
		</button>
	);
}

export function MobileToolStudiesButton({ isOpen, count, onOpen }: { isOpen: boolean; count: number; onOpen: () => void }) {
	return (
		<button type="button" data-testid="mobile-btn-filmstrip-drawer" onClick={onOpen} className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer relative" style={baseBtnStyle(isOpen)} title="Все снимки пациента" aria-label="Открыть галерею снимков пациента" aria-expanded={isOpen}>
			<Layers size={19} />
			<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Снимки</span>
			{count > 0 && <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-teal-600 text-white">{count}</span>}
		</button>
	);
}

export function MobileToolClearButton({ onClear }: { onClear: () => void }) {
	return (
		<button type="button" data-testid="mobile-btn-clear-measurements" onClick={onClear} className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer text-rose-400 hover:text-rose-300" style={{ minWidth: "44px", minHeight: "44px", width: "44px", height: "44px", backgroundColor: "rgba(225, 29, 72, 0.15)", border: "1px solid rgba(225, 29, 72, 0.4)" }} title="Очистить измерения" aria-label="Очистить измерения на снимке">
			<Trash2 size={18} />
			<span style={{ fontSize: "9px", fontWeight: 700, marginTop: "2px" }}>Сброс</span>
		</button>
	);
}
