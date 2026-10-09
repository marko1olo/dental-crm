/**
 * vendorProfiles.ts — Layer 0: Реестр профилей производителей дентальных сенсоров (15 мировых брендов).
 *
 * Implements Mandates 8e, 8s.
 */

import type { SensorVendorProfile } from "./types";

/**
 * Canonical registry of vendor profiles with USB controllers and standard Windows paths.
 */
export const SENSOR_VENDOR_PROFILES: readonly SensorVendorProfile[] = [
	{
		brand: "vatech",
		name: "Vatech",
		country: "Южная Корея",
		defaultDriverType: "hybrid",
		defaultHotFolders: [
			"C:\\EzSensor\\Capture",
			"C:\\EzDent-i\\Capture",
			"C:\\DentalImages\\Vatech\\Incoming",
			"C:\\EasyDent4\\Capture",
		],
		knownVidPids: [
			{ vid: 0x1312, pid: 0x2001, controllerChip: "Vatech Custom USB", description: "EzSensor USB 2.0" },
			{ vid: 0x1312, pid: 0x2002, controllerChip: "Vatech Custom USB", description: "EzSensor HD / Soft" },
			{ vid: 0x0547, pid: 0x1002, controllerChip: "Cypress FX2 (CY7C68013A)", description: "EzSensor Classic Bridge" },
			{ vid: 0x1a86, pid: 0x7523, controllerChip: "QinHeng USB-Serial", description: "Vatech IO Bridge" },
		],
	},
	{
		brand: "carestream",
		name: "Carestream / Kodak Dental",
		country: "США / Франция",
		defaultDriverType: "hybrid",
		defaultHotFolders: [
			"C:\\Carestream\\Capture",
			"C:\\KDIS\\Capture",
			"C:\\TW\\DATA",
			"C:\\Program Files (x86)\\Carestream\\CSImaging\\Capture",
		],
		knownVidPids: [
			{ vid: 0x1080, pid: 0x0001, controllerChip: "Kodak Trophy RVG", description: "RVG 5100 / 6100" },
			{ vid: 0x1080, pid: 0x0002, controllerChip: "Carestream USB", description: "RVG 5200 / 6200" },
			{ vid: 0x04b4, pid: 0x8613, controllerChip: "Cypress FX2 RVG", description: "Carestream RVG Bridge" },
		],
	},
	{
		brand: "planmeca",
		name: "Planmeca",
		country: "Финляндия",
		defaultDriverType: "hot_folder",
		defaultHotFolders: [
			"C:\\Planmeca\\Temp",
			"C:\\Romexis\\Exchange",
			"C:\\Program Files\\Planmeca\\Romexis\\Capture",
		],
		knownVidPids: [
			{ vid: 0x0b6a, pid: 0x0010, controllerChip: "Planmeca USB ASIC", description: "ProSensor Control Box" },
			{ vid: 0x0b6a, pid: 0x0011, controllerChip: "Planmeca HD USB", description: "ProSensor HD Direct" },
		],
	},
	{
		brand: "sirona",
		name: "Dentsply Sirona / Schick",
		country: "Германия / США",
		defaultDriverType: "hybrid",
		defaultHotFolders: [
			"C:\\Sidexis\\Export",
			"C:\\PDATA\\sirocom",
			"C:\\Sirona\\Sidexis4\\Data\\Incoming",
		],
		knownVidPids: [
			{ vid: 0x0d0b, pid: 0x0001, controllerChip: "Schick USB Interface", description: "Schick CDR / Elite" },
			{ vid: 0x0d0b, pid: 0x0002, controllerChip: "Schick USB 2.0", description: "Schick 33 / USB Remote" },
			{ vid: 0x152a, pid: 0x0810, controllerChip: "Sirona USB Bridge", description: "Xios XG / Xios Supreme" },
		],
	},
	{
		brand: "dexis",
		name: "Dexis",
		country: "США",
		defaultDriverType: "hot_folder",
		defaultHotFolders: [
			"C:\\Dexis\\Data",
			"C:\\Dexis\\Images",
			"C:\\DexData\\Incoming",
		],
		knownVidPids: [
			{ vid: 0x14c0, pid: 0x0001, controllerChip: "Dexis USB Controller", description: "Dexis Platinum" },
			{ vid: 0x14c0, pid: 0x0002, controllerChip: "Dexis USB 3.0", description: "Dexis Titanium" },
		],
	},
	{
		brand: "acteon",
		name: "Acteon / Sopro",
		country: "Франция",
		defaultDriverType: "twain_dsm",
		defaultHotFolders: [
			"C:\\Sopro\\Capture",
			"C:\\PSPIX\\Export",
			"C:\\Acteon\\Imaging\\Temp",
		],
		knownVidPids: [
			{ vid: 0x1686, pid: 0x0010, controllerChip: "Sopro Imaging USB", description: "Sopix / Sopix2 ACE" },
			{ vid: 0x1686, pid: 0x0020, controllerChip: "Acteon PSP Interface", description: "PSPIX Scanner" },
		],
	},
	{
		brand: "woodpecker",
		name: "Woodpecker / DTE",
		country: "Китай",
		defaultDriverType: "hot_folder",
		defaultHotFolders: [
			"C:\\i-Sensor\\Images",
			"C:\\iSensor\\Capture",
			"C:\\Woodpecker\\RVG\\Incoming",
		],
		knownVidPids: [
			{ vid: 0x0483, pid: 0x5740, controllerChip: "STM32F4 USB VCP", description: "i-Sensor H1 / H2" },
			{ vid: 0x10c4, pid: 0xea60, controllerChip: "Silicon Labs CP210x", description: "Woodpecker RVG Bridge" },
		],
	},
	{
		brand: "handy",
		name: "Handy Dental",
		country: "Китай",
		defaultDriverType: "hot_folder",
		defaultHotFolders: [
			"C:\\Handy\\Capture",
			"C:\\HDR\\Images",
			"C:\\HandyDentist\\Images",
		],
		knownVidPids: [
			{ vid: 0x0403, pid: 0x6001, controllerChip: "FTDI FT232R USB", description: "Handy HDR-500" },
			{ vid: 0x1a86, pid: 0x7523, controllerChip: "WCH CH340 USB", description: "Handy HDR-600" },
		],
	},
	{
		brand: "kavo",
		name: "KaVo Dental / Gendex",
		country: "Германия / США",
		defaultDriverType: "hybrid",
		defaultHotFolders: [
			"C:\\KaVo\\Export",
			"C:\\DTXStudio\\Export",
			"C:\\VixWin\\Data",
		],
		knownVidPids: [
			{ vid: 0x1054, pid: 0x0700, controllerChip: "KaVo Direct USB", description: "Gendex GXS-700" },
			{ vid: 0x04b4, pid: 0x0700, controllerChip: "Cypress USB FX2", description: "KaVo GXS-700 Bridge" },
		],
	},
	{
		brand: "fona",
		name: "Fona Dental",
		country: "Словакия / Германия",
		defaultDriverType: "twain_dsm",
		defaultHotFolders: [
			"C:\\Fona\\Capture",
			"C:\\OrisWin\\Export",
			"C:\\FonaDental\\Scans",
		],
		knownVidPids: [
			{ vid: 0x0d0b, pid: 0x0010, controllerChip: "Fona USB Controller", description: "Fona CDR / Stellaris" },
		],
	},
	{
		brand: "myray",
		name: "MyRay / Cefla",
		country: "Италия",
		defaultDriverType: "hot_folder",
		defaultHotFolders: [
			"C:\\iRYS\\Export",
			"C:\\MyRay\\ZenX\\Images",
			"C:\\Cefla\\Imaging\\Incoming",
		],
		knownVidPids: [
			{ vid: 0x16d0, pid: 0x0501, controllerChip: "Cefla USB Subsystem", description: "MyRay Zen-X USB" },
		],
	},
	{
		brand: "owandy",
		name: "Owandy Radiology",
		country: "Франция",
		defaultDriverType: "twain_dsm",
		defaultHotFolders: [
			"C:\\Owandy\\QuickVision\\Images",
			"C:\\Owandy\\Capture",
			"C:\\QuickVision\\Export",
		],
		knownVidPids: [
			{ vid: 0x04b4, pid: 0x0080, controllerChip: "Cypress / PLX USB", description: "Owandy Opteo / One" },
		],
	},
	{
		brand: "eighteeth",
		name: "Eighteeth",
		country: "Китай",
		defaultDriverType: "hot_folder",
		defaultHotFolders: [
			"C:\\NanoPix\\Incoming",
			"C:\\Eighteeth\\Scans",
		],
		knownVidPids: [
			{ vid: 0x0483, pid: 0x5720, controllerChip: "STM32 USB Dental", description: "NanoPix 1 / 2" },
		],
	},
	{
		brand: "xpect_vision",
		name: "Xpect Vision",
		country: "Китай",
		defaultDriverType: "hot_folder",
		defaultHotFolders: [
			"C:\\XpectVision\\Scans",
			"C:\\PhotonCounting\\Capture",
		],
		knownVidPids: [
			{ vid: 0x04b4, pid: 0x00f3, controllerChip: "Cypress FX3 SuperSpeed", description: "Photon-Counting Direct Sensor" },
		],
	},
	{
		brand: "duerr",
		name: "Dürr Dental",
		country: "Германия",
		defaultDriverType: "hybrid",
		defaultHotFolders: [
			"C:\\DBSWin\\Data",
			"C:\\VistaSoft\\Capture",
			"C:\\Program Files\\DuerrDental\\VistaSoft\\Import",
		],
		knownVidPids: [
			{ vid: 0x0403, pid: 0x6001, controllerChip: "FTDI FT232R USB UART", description: "Dürr VistaRay 7 Direct USB" },
			{ vid: 0x0403, pid: 0x6014, controllerChip: "FTDI FT232H Hi-Speed", description: "Dürr VistaIntra USB Bridge" },
		],
	},
];
