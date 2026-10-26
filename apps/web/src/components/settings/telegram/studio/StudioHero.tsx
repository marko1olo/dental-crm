import React from "react";
import { Lock, Server, Sparkles, Zap } from "lucide-react";

interface StudioHeroProps {
	onOpenModal: () => void;
}

export const StudioHero: React.FC<StudioHeroProps> = ({ onOpenModal }) => {
	return (
		<div className="tg-studio-hero">
			<div className="tg-studio-hero-content">
				<div className="tg-studio-hero-badges">
					<span className="tg-pill tg-pill-brand">
						<Server size={13} aria-hidden="true" /> Облачный хостинг DENTE
					</span>
					<span className="tg-pill tg-pill-success">
						<Lock size={13} aria-hidden="true" /> Конфиденциально и защищено: Без ПДн
					</span>
					<span className="tg-pill tg-pill-accent">
						<Zap size={13} aria-hidden="true" /> Запуск за 60 секунд
					</span>
				</div>

				<h2 className="tg-studio-hero-title">
					Студия ботов клиники DENTE (Telegram • VK • WhatsApp • MAX)
				</h2>
				<p className="tg-studio-hero-desc">
					Создайте персонального виртуального ассистента для вашей стоматологии.
					Сервер DENTE обеспечивает круглосуточную маршрутизацию, онлайн-запись 24/7,
					напоминания и сбор отзывов пациентов без сторонних посредников.
				</p>

				<div className="tg-hero-actions-row mt-4 flex items-center gap-3 flex-wrap">
					<button
						type="button"
						onClick={onOpenModal}
						className="primary-button tg-hero-btn"
					>
						<Sparkles size={16} />
						<span>Мастер быстрой настройки бота</span>
					</button>
				</div>
			</div>
		</div>
	);
};
