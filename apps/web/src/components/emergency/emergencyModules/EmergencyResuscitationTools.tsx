/**
 * Russian Dental Emergency Clinical Protocols & Resuscitation Suite
 * Layer 4: Emergency Resuscitation Tools (Adrenaline timer, Statutory Order 786n kit memo, CPR guideline)
 */

import React from 'react';
import { Clock, RotateCcw, Syringe, Heart, AlertTriangle } from 'lucide-react';
import { STATUTORY_EMERGENCY_KIT_MEMO, formatTimerSeconds } from '../emergencyRescueEngine';
import type { EmergencyResuscitationToolsProps } from './emergencyRescueTypes';

export function EmergencyResuscitationTools({
	adrenalineTimerSeconds,
	isAdrenalineTimerRunning,
	isAdrenalineDue,
	onStartAdrenalineTimer,
	onResetAdrenalineTimer,
}: EmergencyResuscitationToolsProps): React.ReactElement {
	return (
		<>
			{/* Adrenaline Countdown Timer */}
			<div className="emergency-timer-box">
				<div className="emergency-timer-title min-w-0">
					<Clock size={20} />
					<span className="truncate min-w-0">ТАЙМЕР ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА</span>
				</div>

				<div className={`emergency-timer-display ${isAdrenalineDue ? 'due' : ''}`}>
					{formatTimerSeconds(adrenalineTimerSeconds)}
				</div>

				{isAdrenalineDue && (
					<div className="emergency-timer-alert">
						<AlertTriangle className="w-4 h-4 shrink-0" />
						<span>ВРЕМЯ ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА (0.3–0.5 МЛ В/М)!</span>
					</div>
				)}

				<div className="emergency-timer-buttons">
					<button
						type="button"
						className={`emergency-timer-btn ${isAdrenalineTimerRunning ? 'active' : ''}`}
						onClick={() => onStartAdrenalineTimer(300)}
						title="Запустить таймер повторного введения адреналина (5 минут по стандарту МЗ РФ № 1079н)"
					>
						<Clock size={14} />
						<span>Старт 5 мин</span>
					</button>
					<button
						type="button"
						className="emergency-timer-btn"
						onClick={onResetAdrenalineTimer}
						title="Сбросить таймер адреналина"
					>
						<RotateCcw size={14} />
						<span>Сброс</span>
					</button>
				</div>
			</div>

			{/* Statutory Emergency Kit Quick Reference (1-Click Static Memo) */}
			<div className="emergency-cpr-box">
				<div className="emergency-cpr-header">
					<div className="emergency-cpr-title min-w-0">
						<Syringe size={18} style={{ color: 'var(--teal)' }} />
						<span className="truncate min-w-0" data-statutory="786н / 1144н">Укладка неотложной помощи</span>
					</div>
				</div>

				<div className="emergency-cpr-guidelines-list">
					{STATUTORY_EMERGENCY_KIT_MEMO.map((kit) => (
						<div key={kit.drugId} className="emergency-kit-row">
							<div className="emergency-kit-row-top">
								<span className="emergency-kit-row-name truncate min-w-0" title={kit.tradeNameRu}>{kit.tradeNameRu}</span>
								<span className="emergency-cpr-val highlight-ok shrink-0 emergency-kit-row-dose">{kit.dosageStandardRu.split(';')[0]}</span>
							</div>
							<span className="truncate min-w-0 emergency-kit-row-route" title={kit.routeRu}>{kit.routeRu}</span>
						</div>
					))}
				</div>
			</div>

			{/* Statutory Resuscitation Guidelines Card */}
			<div className="emergency-cpr-box">
				<div className="emergency-cpr-header">
					<div className="emergency-cpr-title min-w-0">
						<Heart size={18} style={{ color: 'var(--bad-fg)' }} />
						<span className="truncate min-w-0">СТАНДАРТ БАЗОВОЙ СЛР (МИНЗДРАВ РФ & ФАР)</span>
					</div>
				</div>

				<div className="emergency-cpr-guidelines-list">
					<div className="emergency-cpr-guideline-row">
						<span className="emergency-cpr-label truncate min-w-0">Соотношение:</span>
						<span className="emergency-cpr-val highlight-bad shrink-0">30 компрессий : 2 вдоха</span>
					</div>
					<div className="emergency-cpr-guideline-row">
						<span className="emergency-cpr-label truncate min-w-0">Частота нажатий:</span>
						<span className="emergency-cpr-val shrink-0">100–120 в минуту</span>
					</div>
					<div className="emergency-cpr-guideline-row">
						<span className="emergency-cpr-label truncate min-w-0">Глубина компрессий:</span>
						<span className="emergency-cpr-val shrink-0">5–6 см (1/3 грудной клетки)</span>
					</div>
					<div className="emergency-cpr-guideline-row">
						<span className="emergency-cpr-label truncate min-w-0">Положение:</span>
						<span className="emergency-cpr-val highlight-ok shrink-0">Твердая горизонтальная поверхность</span>
					</div>
				</div>
			</div>
		</>
	);
}
