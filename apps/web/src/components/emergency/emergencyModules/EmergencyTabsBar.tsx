/**
 * Emergency Tabs Bar (Layer 4)
 * Two canonical tabs: Dispatcher cheat sheet and First-line emergency kit.
 */

import React from 'react';
import { PhoneCall, Syringe } from 'lucide-react';

interface EmergencyTabsBarProps {
	activeTab: 'cheatsheet' | 'kit';
	setActiveTab: (tab: 'cheatsheet' | 'kit') => void;
}

export function EmergencyTabsBar({ activeTab, setActiveTab }: EmergencyTabsBarProps) {
	return (
		<div className="emergency-tabs-bar" role="tablist" aria-label="Вкладки экстренной помощи">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === 'cheatsheet'}
				className={`emergency-tab-btn ${activeTab === 'cheatsheet' ? 'active-cheatsheet' : ''}`}
				onClick={() => setActiveTab('cheatsheet')}
				data-testid="emergency-tab-cheatsheet"
			>
				<PhoneCall size={18} />
				<span>Шпаргалка для диспетчера 112 / 103</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === 'kit'}
				className={`emergency-tab-btn ${activeTab === 'kit' ? 'active-kit' : ''}`}
				onClick={() => setActiveTab('kit')}
				data-testid="emergency-tab-kit"
			>
				<Syringe size={18} />
				<span>Состав аптечки и дозировки 1-й линии</span>
			</button>
		</div>
	);
}
