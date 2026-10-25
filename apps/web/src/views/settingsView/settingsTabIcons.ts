/**
 * @file apps/web/src/views/settingsView/settingsTabIcons.ts
 * @description Layer 4: Icons registry for settings navigation tabs.
 */

import type React from "react";
import {
	Bot,
	Building2,
	Database,
	DollarSign,
	FileText,
	HardDrive,
	HardDriveDownload,
	Layers,
	LineChart,
	Lock,
	MessageSquare,
	Percent,
	Puzzle,
	Send,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	User,
	Users,
	Wand2,
} from "lucide-react";

export const SETTINGS_TAB_ICONS: Record<
	string,
	React.ComponentType<{ size?: number; className?: string }>
> = {
	profile: User,
	preferences: Wand2,
	clinic: Building2,
	modules: Puzzle,
	staff: Users,
	commissions: Percent,
	access: Lock,
	telegram: MessageSquare,
	hardware: HardDrive,
	protocols: FileText,
	rules: ShieldAlert,
	"procedure-boms": Layers,
	prices: DollarSign,
	ai: Bot,
	insurance: ShieldCheck,
	marketing: Send,
	bpmn: SlidersHorizontal,
	sources: Database,
	reporting: LineChart,
	imports: HardDriveDownload,
	audit: Lock,
};
