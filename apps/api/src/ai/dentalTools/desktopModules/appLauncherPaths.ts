/**
 * @file appLauncherPaths.ts
 * @description Стандартные пути установки медицинского и диагностического софта клиники на Windows.
 */

export const STANDARD_APP_PATHS: Record<string, string[]> = {
	vatech_ezdent: [
		"C:\\Program Files (x86)\\VATECH\\EzDent-i\\EzDent-i.exe",
		"C:\\Program Files\\VATECH\\EzDent-i\\EzDent-i.exe",
		"C:\\VATECH\\EzDent-i\\EzDent-i.exe",
	],
	planmeca_romexis: [
		"C:\\Program Files\\Planmeca\\Romexis\\Romexis.exe",
		"C:\\Planmeca\\Romexis\\Romexis.exe",
	],
	ezsensor: [
		"C:\\Program Files (x86)\\Vatech\\EasyDent4\\EasyDent.exe",
		"C:\\EasyDent4\\EasyDent.exe",
	],
	ondemand3d: [
		"C:\\Program Files\\Cybermed\\OnDemand3D\\OnDemand3D.exe",
		"C:\\Program Files (x86)\\Cybermed\\OnDemand3D\\OnDemand3D.exe",
	],
	sidexis: [
		"C:\\Program Files (x86)\\Sirona Dental Systems\\SIDEXIS 4\\Sidexis4.exe",
		"C:\\SIDEXIS4\\Sidexis4.exe",
	],
	threeshape_dental_system: [
		"C:\\Program Files\\3Shape\\Dental System\\DentalSystem.exe",
		"C:\\3Shape\\DentalSystem.exe",
	],
	exocad: [
		"C:\\Program Files\\exocad\\DentalCAD\\DentalCAD.exe",
		"C:\\exocad\\DentalCAD.exe",
	],
	itero: ["C:\\Program Files\\Align Technology\\iTero\\iTero.exe"],
};
