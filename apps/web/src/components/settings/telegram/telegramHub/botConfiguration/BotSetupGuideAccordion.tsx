import React from "react";
import { Bot, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface BotSetupGuideAccordionProps {
	isBotGuideOpen: boolean;
	setIsBotGuideOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function BotSetupGuideAccordion({
	isBotGuideOpen,
	setIsBotGuideOpen,
}: BotSetupGuideAccordionProps) {
	return (
		<div className="tg-guide-box">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					cursor: "pointer",
					minHeight: "44px",
				}}
				onClick={() => setIsBotGuideOpen((prev) => !prev)}
			>
				<div
					style={{
						fontWeight: 700,
						fontSize: "14px",
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<Bot size={18} color="var(--teal)" />
					<span>Как создать бота в Telegram за 1 минуту</span>
				</div>
				<button
					type="button"
					style={{
						background: "none",
						border: "none",
						color: "var(--muted)",
						cursor: "pointer",
						minWidth: "44px",
						minHeight: "44px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					aria-label={isBotGuideOpen ? "Свернуть инструкцию" : "Развернуть инструкцию"}
				>
					{isBotGuideOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
				</button>
			</div>

			{isBotGuideOpen && (
				<div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
					<div className="tg-guide-step">
						<div className="tg-step-badge">1</div>
						<div className="tg-step-text">
							Откройте официального бота{" "}
							<a
								href="https://t.me/BotFather"
								target="_blank"
								rel="noreferrer"
								className="tg-profile-link"
							>
								@BotFather
								<ExternalLink size={12} />
							</a>{" "}
							в Telegram и отправьте команду <span className="tg-code-tag">/newbot</span>.
						</div>
					</div>
					<div className="tg-guide-step">
						<div className="tg-step-badge">2</div>
						<div className="tg-step-text">
							Укажите название вашей клиники (например, <em>Стоматология DENTE</em>) и уникальный
							username с окончанием на <span className="tg-code-tag">bot</span> (например,{" "}
							<em>dente_clinic_bot</em>).
						</div>
					</div>
					<div className="tg-guide-step">
						<div className="tg-step-badge">3</div>
						<div className="tg-step-text">
							Скопируйте полученную строку HTTP API токена и вставьте в поле выше.
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
