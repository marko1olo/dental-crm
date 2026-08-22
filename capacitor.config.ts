/**
 * DENTE Dental CRM — Capacitor Mobile & Tablet Configuration (.APK)
 */

export interface CapacitorServerConfig {
	androidScheme?: string;
	cleartext?: boolean;
	hostname?: string;
	url?: string;
}

export interface CapacitorAndroidConfig {
	allowMixedContent?: boolean;
	captureInput?: boolean;
	webContentsDebuggingEnabled?: boolean;
	backgroundColor?: string;
}

export interface CapacitorAppConfig {
	appId: string;
	appName: string;
	webDir: string;
	bundledWebRuntime: boolean;
	server?: CapacitorServerConfig;
	android?: CapacitorAndroidConfig;
	plugins?: Record<string, unknown>;
}

const config: CapacitorAppConfig = {
	appId: "ru.dente.crm",
	appName: "DENTE Dental CRM",
	webDir: "dist",
	bundledWebRuntime: false,
	server: {
		androidScheme: "https",
		cleartext: true,
	},
	android: {
		allowMixedContent: true,
		captureInput: true,
		webContentsDebuggingEnabled: true,
		backgroundColor: "#0f172a",
	},
	plugins: {
		SplashScreen: {
			launchShowDuration: 1500,
			backgroundColor: "#0f172a",
			showSpinner: false,
		},
		StatusBar: {
			style: "DARK",
			backgroundColor: "#0f172a",
		},
		Keyboard: {
			resize: "body",
			style: "DARK",
		},
	},
};

export default config;
