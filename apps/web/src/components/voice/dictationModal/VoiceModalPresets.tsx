/**
 * VoiceModalPresets.tsx — Клинические голосовые шаблоны и резервный текстовый ввод.
 * Строго <= 120 строк по Мандату 8b.
 */

import { Send } from "lucide-react";

interface VoiceModalPresetsProps {
	manualInput: string;
	onManualInputChange: (val: string) => void;
	onApplyText: (text: string) => void;
}

const QUICK_EXAMPLES = [
	"Норма по соматике",
	"Кариес 36 зуб дистальный",
	"Зуб 46 кариес дентина",
	"Шестнадцатый зуб острый пульпит",
	"Анестезия убистезин 1.7 мл 1 карпула",
	"Коффердам установлен",
	"Жалобы: ноющая боль от холодного",
	"Объективно: глубокая кариозная полость на окклюзионной поверхности",
	"Лечение: некротомия, медобработка, адгезивный протокол, пломба светового отверждения",
	"Рекомендации: исключить твердую пищу на 2 часа",
];

export function VoiceModalPresets({
	manualInput,
	onManualInputChange,
	onApplyText,
}: VoiceModalPresetsProps) {
	return (
		<div>
			<div>
				<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)", marginBottom: "8px" }}>
					Клинические голосовые шаблоны:
				</div>
				<div className="dnt-voice-cheatsheet">
					{QUICK_EXAMPLES.map((example) => (
						<button
							key={example}
							type="button"
							onClick={() => onApplyText(example)}
							className="dnt-voice-cheatsheet-pill"
						>
							{example}
						</button>
					))}
				</div>
			</div>

			<form
				className="dnt-voice-fallback-bar"
				onSubmit={(e) => {
					e.preventDefault();
					onApplyText(manualInput);
				}}
			>
				<input
					type="text"
					value={manualInput}
					onChange={(e) => onManualInputChange(e.target.value)}
					placeholder="Введите клиническую команду текстом (резервный ввод)..."
					className="dnt-voice-input"
				/>
				<button type="submit" disabled={false} className="voice-btn-apply">
					<Send size={16} />
					<span>Распознать</span>
				</button>
			</form>
		</div>
	);
}
