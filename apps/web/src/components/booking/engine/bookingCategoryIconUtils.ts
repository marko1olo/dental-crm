import React from "react";
import { Activity, Scissors, Smile, Sparkles, Stethoscope } from "lucide-react";

export function resolveCategoryIcon(iconName: string): React.ReactElement {
	switch (iconName) {
		case "Stethoscope":
			return React.createElement(Stethoscope, { size: 22 });
		case "Sparkles":
			return React.createElement(Sparkles, { size: 22 });
		case "Scissors":
			return React.createElement(Scissors, { size: 22 });
		case "Smile":
			return React.createElement(Smile, { size: 22 });
		case "Activity":
		default:
			return React.createElement(Activity, { size: 22 });
	}
}
