import React from "react";
import { Check, Copy, MessageSquare, Moon, RefreshCw, Sun } from "lucide-react";
import type { ChannelConfig } from "./types";

interface SimulatorToolbarProps {
	config: ChannelConfig;
	copied: boolean;
	activeTheme: "light" | "dark";
	onCopy: () => void;
	onToggleTheme: () => void;
	onReset: () => void;
}

export const SimulatorToolbar: React.FC<SimulatorToolbarProps> = ({
	config,
	copied,
	activeTheme,
	onCopy,
	onToggleTheme,
	onReset,
}) => {
	return (
		<div className="tg-sim-toolbar">
			<div className="tg-sim-toolbar-title">
				<MessageSquare size={14} style={{ color: config.iconColor }} aria-hidden="true" />
				<span>Предпросмотр {config.badge}</span>
				<span className="tg-sim-live-badge">Live</span>
			</div>
			<div className="tg-sim-toolbar-actions">
				<button
					type="button"
					onClick={onCopy}
					className="tg-sim-tool-btn"
					title="Копировать текст сообщения"
					data-testid="tg-copy-message-btn"
				>
					{copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
					<span>{copied ? "Скопировано!" : "Копировать"}</span>
				</button>
				<button
					type="button"
					onClick={onToggleTheme}
					className="tg-sim-tool-btn"
					title={
						activeTheme === "light"
							? "Включить тёмную тему предпросмотра"
							: "Включить светлую тему предпросмотра"
					}
				>
					{activeTheme === "light" ? <Moon size={13} /> : <Sun size={13} />}
					<span>Тема</span>
				</button>
				<button
					type="button"
					onClick={onReset}
					className="tg-sim-tool-btn"
					title="Перезапустить диалог бота"
				>
					<RefreshCw size={13} />
					<span>/start</span>
				</button>
			</div>
		</div>
	);
};
