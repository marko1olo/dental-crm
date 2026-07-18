const fs = require('fs');

const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/components/OmnichannelInboxView.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Update ChatMessage interface
if (!code.includes('attachments?:')) {
    code = code.replace(
        /interface ChatMessage \{([\s\S]*?)createdAt: string;/g,
        'interface ChatMessage {$1createdAt: string;\n\tattachments?: { name: string; url: string; type: string }[];'
    );
}

// 2. Add pending attachments state and ref inside OmnichannelInboxView
if (!code.includes('pendingAttachments')) {
    code = code.replace(
        /const messagesEndRef = useRef<HTMLDivElement>\(null\);/g,
        `const messagesEndRef = useRef<HTMLDivElement>(null);\n\tconst fileInputRef = useRef<HTMLInputElement>(null);\n\tconst [pendingAttachments, setPendingAttachments] = useState<File[]>([]);`
    );
}

// 3. Update handleSend to include pendingAttachments
if (!code.includes('attachments: pendingAttachments.map')) {
    code = code.replace(
        /body: JSON.stringify\(\{[\s\S]*?channel: channelToUse,[\s\S]*?\}\),/g,
        `body: JSON.stringify({\n\t\t\t\t\t\tmessage: inputText.trim(),\n\t\t\t\t\t\tchannel: channelToUse,\n\t\t\t\t\t\tattachments: pendingAttachments.map(f => ({\n\t\t\t\t\t\t\tname: f.name,\n\t\t\t\t\t\t\turl: URL.createObjectURL(f),\n\t\t\t\t\t\t\ttype: f.type\n\t\t\t\t\t\t}))\n\t\t\t\t\t}),`
    );
    
    // Also clear attachments on success
    code = code.replace(
        /setInputText\(""\);/g,
        `setInputText("");\n\t\t\t\tsetPendingAttachments([]);`
    );
}

// 4. Update the Message renderer to show attachments
if (!code.includes('msg.attachments?.length')) {
    code = code.replace(
        /\{msg\.message\}\n\t\t\t\t\t\t\t\t\t\t\t<\/span>/g,
        `{msg.message}\n\t\t\t\t\t\t\t\t\t\t\t</span>\n\t\t\t\t\t\t\t\t\t\t\t{msg.attachments && msg.attachments.length > 0 && (\n\t\t\t\t\t\t\t\t\t\t\t\t<div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>\n\t\t\t\t\t\t\t\t\t\t\t\t\t{msg.attachments.map((att, i) => (\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div key={i} style={{ background: isOutbound ? "rgba(0,0,0,0.15)" : "var(--paper-soft)", padding: "4px 8px", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<Paperclip size={12} />\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t{att.name}\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t\t\t\t\t\t))}\n\t\t\t\t\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t\t\t\t)}`
    );
}

// 5. Update input area: add file input logic, show pending attachments, and fix the Paperclip button onClick
if (!code.includes('fileInputRef.current?.click()')) {
    // 5a. Replace paperclip button
    code = code.replace(
        /<Paperclip size=\{20\} \/>\n\t\t\t\t\t\t\t\t\t<\/button>/g,
        `<Paperclip size={20} />\n\t\t\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t\t\t\t<input type="file" ref={fileInputRef} style={{ display: "none" }} multiple onChange={(e) => { if (e.target.files) { setPendingAttachments([...pendingAttachments, ...Array.from(e.target.files)]); e.target.value = ""; } }} />`
    );
    
    // Add onClick to paperclip button
    code = code.replace(
        /cursor: "pointer",\n\t\t\t\t\t\t\t\t\t\t\tpadding: 6,\n\t\t\t\t\t\t\t\t\t\t\}\}/g,
        `cursor: "pointer",\n\t\t\t\t\t\t\t\t\t\t\tpadding: 6,\n\t\t\t\t\t\t\t\t\t\t}}\n\t\t\t\t\t\t\t\t\t\tonClick={() => fileInputRef.current?.click()}`
    );
    
    // Render pending attachments above input
    code = code.replace(
        /<form\n\t\t\t\t\t\t\t\t\tstyle=\{\{/g,
        `{pendingAttachments.length > 0 && (
										<div style={{ display: "flex", gap: 8, padding: "0 20px 10px", flexWrap: "wrap" }}>
											{pendingAttachments.map((f, i) => (
												<div key={i} style={{ background: "var(--paper-soft)", border: "1px solid var(--line)", padding: "4px 8px", borderRadius: 12, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
													<span style={{ maxWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
													<button type="button" onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}><X size={12} /></button>
												</div>
											))}
										</div>
									)}
									<form
									style={{`
    );
}

// 6. Fix "disabled" state of submit button to allow sending if we only have attachments and no text
code = code.replace(
    /disabled=\{!inputText\.trim\(\)\}/g,
    `disabled={!inputText.trim() && pendingAttachments.length === 0}`
);
code = code.replace(
    /background: inputText\.trim\(\) \? "var\(--teal\)" : "var\(--line\)"/g,
    `background: (inputText.trim() || pendingAttachments.length > 0) ? "var(--teal)" : "var(--line)"`
);
code = code.replace(
    /cursor: inputText\.trim\(\) \? "pointer" : "default"/g,
    `cursor: (inputText.trim() || pendingAttachments.length > 0) ? "pointer" : "default"`
);
// Fix handleSend early return
code = code.replace(
    /if \(!inputText\.trim\(\) \|\| !selectedPatientId\) return;/g,
    `if ((!inputText.trim() && pendingAttachments.length === 0) || !selectedPatientId) return;`
);

fs.writeFileSync(path, code);
console.log('Done refactoring OmnichannelInboxView.tsx for attachments.');
