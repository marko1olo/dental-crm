/**
 * XML tokenizer and DOM tree parser for Dental4Windows XML exports.
 */

export interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  text: string;
  children: XmlNode[];
}

export class D4wXmlTokenizer {
  	public static parseXmlTree(xml: string): XmlNode {
  		// Очищаем комментарии <!-- ... --> и декларации <?xml ... ?>
  		const cleanXml = xml
  			.replace(/<!--[\s\S]*?-->/g, "")
  			.replace(/<\?xml[\s\S]*?\?>/g, "")
  			.trim();
  
  		const tagRegex = /<(\/)?([a-zA-Z0-9_:.-]+)([^>]*?)(\/)?>|([^<]+)/g;
  		const stack: XmlNode[] = [];
  		let root: XmlNode | null = null;
  
  		let match: RegExpExecArray | null = null;
  		while ((match = tagRegex.exec(cleanXml)) !== null) {
  			const isClosing = Boolean(match[1]);
  			const rawTagName = match[2];
  			const rawAttrs = match[3] ?? "";
  			const isSelfClosing = Boolean(match[4]);
  			const textContent = match[5];
  
  			if (rawTagName) {
  				const tagName = rawTagName
  					.split(":")
  					.pop()!
  					.toLowerCase();
  
  				if (isClosing) {
  					if (stack.length > 1) {
  						stack.pop();
  					}
  				} else {
  					const node: XmlNode = {
  						name: tagName,
  						attributes:
  							D4wXmlTokenizer.parseAttributes(rawAttrs),
  						text: "",
  						children: [],
  					};
  
  					if (stack.length > 0) {
  						const parent = stack[stack.length - 1];
  						if (parent) parent.children.push(node);
  					} else {
  						root = node;
  					}
  
  					if (!isSelfClosing) {
  						stack.push(node);
  					}
  				}
  			} else if (textContent) {
  				const cleanText = textContent.trim();
  				if (cleanText && stack.length > 0) {
  					const current = stack[stack.length - 1];
  					if (current) {
  						const unescaped =
  							D4wXmlTokenizer.unescapeXml(cleanText);
  						current.text = current.text
  							? `${current.text} ${unescaped}`
  							: unescaped;
  					}
  				}
  			}
  		}
  
  		if (!root) {
  			return { name: "root", attributes: {}, text: "", children: [] };
  		}
  
  		return root;
  	}
  
  	public static parseAttributes(rawAttrs: string): Record<string, string> {
  		const result: Record<string, string> = {};
  		const attrRegex = /([a-zA-Z0-9_:.-]+)=["']([^"']*)["']/g;
  		let m: RegExpExecArray | null = null;
  		while ((m = attrRegex.exec(rawAttrs)) !== null) {
  			const key = (m[1] ?? "")
  				.split(":")
  				.pop()!
  				.toLowerCase();
  			result[key] = D4wXmlTokenizer.unescapeXml(m[2] ?? "");
  		}
  		return result;
  	}
  
  	public static unescapeXml(str: string): string {
  		return str
  			.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  			.replace(/&amp;/g, "&")
  			.replace(/&lt;/g, "<")
  			.replace(/&gt;/g, ">")
  			.replace(/&quot;/g, '"')
  			.replace(/&apos;/g, "'")
  			.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
  			.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
  				String.fromCharCode(Number.parseInt(hex, 16)),
  			);
  	}
  
  	public static findNodes(node: XmlNode, targetNames: string[]): XmlNode[] {
  		const matches: XmlNode[] = [];
  		const targets = new Set(targetNames.map((n) => n.toLowerCase()));
  
  		function walk(curr: XmlNode) {
  			if (targets.has(curr.name)) {
  				// Если узел является контейнером со вложенными такими же узлами (например <Patients><Patient>...)
  				const innerChildren = curr.children.filter((c) =>
  					targets.has(c.name),
  				);
  				if (innerChildren.length > 0) {
  					innerChildren.forEach((child) => matches.push(child));
  				} else {
  					matches.push(curr);
  				}
  			}
  			for (const child of curr.children) {
  				if (!targets.has(curr.name)) {
  					walk(child);
  				}
  			}
  		}
  
  		walk(node);
  		return matches;
  	}
  
  	public static findFirstText(node: XmlNode, names: string[]): string {
  		const targetSet = new Set(names.map((n) => n.toLowerCase()));
  		let result = "";
  
  		function walk(curr: XmlNode): boolean {
  			if (targetSet.has(curr.name) && curr.text) {
  				result = curr.text;
  				return true;
  			}
  			for (const child of curr.children) {
  				if (walk(child)) return true;
  			}
  			return false;
  		}
  
  		walk(node);
  		return result;
  	}
  
  	public static nodeToFlatMap(node: XmlNode): Record<string, string> {
  		const map: Record<string, string> = { ...node.attributes };
  		if (node.text) {
  			map["value"] = node.text;
  		}
  
  		for (const child of node.children) {
  			if (child.children.length === 0 && child.text) {
  				map[child.name] = child.text;
  			} else {
  				for (const [k, v] of Object.entries(child.attributes)) {
  					map[`${child.name}_${k}`] = v;
  				}
  				if (child.text) {
  					map[child.name] = child.text;
  				}
  			}
  		}
  
  		return map;
  	}
  
}
