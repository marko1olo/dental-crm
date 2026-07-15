const fs = require("fs");

function refactorFile(file) {
	let code = fs.readFileSync(file, "utf8");

	// 1. Details to Cards
	code = code.replace(
		/<details className="payment-capture-detail-section" open=\{([^}]+)\}>/g,
		'<details className="smart-details" open={$1}>',
	);
	// Sometimes it's just <details> or <details open>
	code = code.replace(/<details>/g, '<details className="smart-details">');
	code = code.replace(
		/<details open>/g,
		'<details className="smart-details" open>',
	);

	// Wrap summary and add smart-details-content
	// This is tricky because we need to insert closing div before </details>
	// A safer way: replace <summary>X</summary> with <summary>X</summary><div className="smart-details-content">
	// and replace </details> with </div></details>
	// But ONLY for smart-details. Let's do it manually for known details in these files if needed, or just do the general regex:
	// Actually, replacing <summary>(.*?)</summary> globally might break if we have multiple or nested.
	// Let's rely on standard details in these files.
	// We'll skip general details replacement and focus on specific ones if needed, or do it by hand.

	// 2. Refactor inputs
	// <label>\s*(text)\s*<input attrs />\s*</label>
	// We will run this regex in a loop to catch all

	let matches;
	const inputRegex =
		/<label>\s*([^{<]+?)\s*<(input|DigitsInput|textarea)([^>]*(?:\/|>[^<]*<\/\2))>\s*<\/label>/g;

	code = code.replace(inputRegex, (match, labelText, tag, attrs) => {
		labelText = labelText.trim();
		// if attrs already has placeholder, remove it or combine it?
		// Let's just append placeholder=" " before the closing /> or >
		let newAttrs = attrs;
		if (!newAttrs.includes("placeholder=")) {
			if (newAttrs.endsWith("/>")) {
				newAttrs = newAttrs.slice(0, -2) + ' placeholder=" " />';
			} else if (newAttrs.endsWith(">")) {
				newAttrs = newAttrs.slice(0, -1) + ' placeholder=" ">';
			}
		} else {
			// replace existing placeholder with " " and put old one in label
			const phMatch = newAttrs.match(/placeholder=(?:"([^"]*)"|\{([^}]*)\})/);
			if (phMatch) {
				const phVal = phMatch[1] ? `"${phMatch[1]}"` : `{${phMatch[2]}}`;
				// We can append to label if we want, or just leave it.
				// Actually, if it has a dynamic placeholder `{patientDefaults.fullName ?? "..."}` it's hard to put in label.
				// Let's just keep the placeholder as is if it's dynamic, and add `no-float` class.
				if (phMatch[0].includes("{")) {
					return `<div className="smart-field no-float">\n  <${tag}${attrs}>\n  <label>${labelText}</label>\n</div>`;
				} else {
					// it's a string placeholder
					const strVal = phMatch[1];
					newAttrs = newAttrs.replace(phMatch[0], 'placeholder=" "');
					labelText = `${labelText} (${strVal})`;
				}
			}
		}

		// Check if it has type="date" or "time" -> needs no-float
		let extraClass = "";
		if (
			newAttrs.includes('type="date"') ||
			newAttrs.includes('type="time"') ||
			newAttrs.includes('type="datetime-local"')
		) {
			extraClass = " no-float";
		}

		return `<div className="smart-field${extraClass}">
  <${tag}${newAttrs}
  <label>${labelText}</label>
</div>`;
	});

	fs.writeFileSync(file, code, "utf8");
	console.log("Refactored", file);
}

refactorFile("apps/web/src/ScheduleView.tsx");
