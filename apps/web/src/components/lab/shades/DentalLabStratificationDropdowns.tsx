import { VITA_CLASSICAL_SHADES } from "../labMath";

export function DentalLabStratificationDropdowns({
	shadeCervical,
	setShadeCervical,
	shadeBody,
	setShadeBody,
	shadeIncisal,
	setShadeIncisal,
}: {
	readonly shadeCervical: string;
	readonly setShadeCervical: (s: string) => void;
	readonly shadeBody: string;
	readonly setShadeBody: (s: string) => void;
	readonly shadeIncisal: string;
	readonly setShadeIncisal: (s: string) => void;
}) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
			<div>
				<label
					htmlFor="shade-cervical-select"
					className="block text-[11px] font-semibold mb-1"
				>
					1. Пришейка:
				</label>
				<select
					id="shade-cervical-select"
					value={shadeCervical}
					onChange={(e) => setShadeCervical(e.target.value)}
					className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:ring-1 focus:ring-teal-500"
				>
					{VITA_CLASSICAL_SHADES.map((s) => (
						<option key={s} value={s}>
							VITA {s}
						</option>
					))}
				</select>
			</div>
			<div>
				<label
					htmlFor="shade-body-select"
					className="block text-[11px] font-semibold mb-1"
				>
					2. Тело зуба:
				</label>
				<select
					id="shade-body-select"
					value={shadeBody}
					onChange={(e) => setShadeBody(e.target.value)}
					className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:ring-1 focus:ring-teal-500"
				>
					{VITA_CLASSICAL_SHADES.map((s) => (
						<option key={s} value={s}>
							VITA {s}
						</option>
					))}
				</select>
			</div>
			<div>
				<label
					htmlFor="shade-incisal-select"
					className="block text-[11px] font-semibold mb-1"
				>
					3. Режущий край:
				</label>
				<select
					id="shade-incisal-select"
					value={shadeIncisal}
					onChange={(e) => setShadeIncisal(e.target.value)}
					className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:ring-1 focus:ring-teal-500"
				>
					{VITA_CLASSICAL_SHADES.map((s) => (
						<option key={s} value={s}>
							VITA {s}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
