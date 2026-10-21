---
name: Reconnaissance & Search Arsenal
description: Teaches the agent how to navigate and search large codebases efficiently using structural search (ast-grep), rapid text search (ripgrep), dependency graphs (madge), and structural file discovery (fd). This skill must be invoked when starting a refactoring task, debugging an unfamiliar system, or surveying a project.
---

# RECONNAISSANCE DOCTRINE
When analyzing or searching inside a codebase, DO NOT rely purely on native tools if the project is massive. You have access to a specialized arsenal installed on this system.

## 1. ast-grep (sg) - Structural Search
Use ast-grep (`sg`) to find patterns structurally rather than purely by text. It understands ASTs and ignores whitespace/comments.
**Execution:** Use `run_command` in powershell.
- **Find all console.log calls:** `sg -p 'console.log($A)' -l ts,js,tsx,jsx`
- **Find a specific React hook:** `sg -p 'useEffect($F, [])'`
- **Find class definitions:** `sg -p 'class $A { $$$ }'`

*Tip:* Use the `$A`, `$B` variables for single AST nodes, and `$$$` for multiple statements (like the body of a function).

## 2. ripgrep (rg) - Ultra-fast Text Search
When you need raw speed and don't care about AST structure.
**Execution:** Use `run_command` in powershell.
- **Find string ignoring case:** `rg -i "TODO"`
- **Find string and show 2 lines of context:** `rg -C 2 "interface User"`
- **Find string only in TypeScript files:** `rg "API_KEY" -t ts`

## 3. fd - File Discovery
Fast alternative to `find` in massive directories, respects `.gitignore`.
- **Find all TSX files:** `fd -e tsx`
- **Find a file by partial name:** `fd "Button"`

## 4. madge - Dependency Graphs (For JS/TS projects)
Crucial before refactoring monoliths to prevent dependency loops.
- **Check for circular dependencies:** `madge --circular .`
- **Check dependencies of a specific file:** `madge path/to/App.tsx`

## 5. tokei - Codebase Statistics
Use this to get an initial understanding of the project's scale.
- **Run:** `tokei .`

## 6. jq - JSON Processor
When dealing with massive JSON dumps, save files, or API outputs:
- **Format and read:** `jq . file.json`
- **Extract a specific field:** `jq '.users[].id' file.json`

# MANDATE
As an AI Agent, you MUST use these tools to perform initial reconnaissance before writing code or modifying complex legacy systems. Blind edits lead to critical failures.

## 7. repomix - Codebase Context Packing
When you need to dump the entire codebase into a single AI-friendly Markdown/XML file (e.g. for passing context to another LLM).
- **Command:** `repomix .` (outputs to repomix-instruction.md)

## 8. semgrep - Advanced Static Analysis
When looking for security flaws or deep logical bugs across the codebase.
- **Command:** `semgrep scan --config auto`

## 9. biome - Formatting & Linting (JS/TS)
To format or lint large JS/TS codebases in milliseconds.
- **Format:** `biome format --write .`
- **Lint:** `biome lint --apply .`
