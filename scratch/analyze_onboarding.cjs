const fs = require('fs');
const content = fs.readFileSync('scratch/onboarding.txt', 'utf8');

// Regex to find variable usages
const wordRegex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
const words = new Set();
let match;
while ((match = wordRegex.exec(content)) !== null) {
  words.add(match[0]);
}

// These are basic HTML/React/JS words that we can ignore
const ignoreList = new Set([
  'div', 'section', 'h2', 'p', 'span', 'strong', 'small', 'button', 'input', 'label', 'ul', 'li', 'svg', 'path',
  'className', 'id', 'type', 'onClick', 'onChange', 'value', 'checked', 'placeholder', 'disabled', 'aria', 'hidden',
  'href', 'target', 'rel', 'style', 'key', 'src', 'alt', 'width', 'height', 'htmlFor', 'role', 'tabIndex', 'autoComplete',
  'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined', 'void', 'typeof', 'keyof', 'const', 'let', 'var',
  'map', 'filter', 'reduce', 'slice', 'push', 'pop', 'shift', 'unshift', 'length', 'Math', 'Date', 'String', 'Number',
  'Array', 'Object', 'Boolean', 'console', 'window', 'document', 'navigator', 'setTimeout', 'setInterval', 'clearTimeout',
  'React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext', 'Suspense', 'lazy',
  'e', 'event', 'target', 'value', 'targetValue', 'step', 'chair', 'spec', 'chairId', 'day', 'intervalIndex', 'setDayIntervals', 'handleChairScheduleSave', 'id', 'name', 'specialization', 'intervals', 'timeStart', 'timeEnd'
]);

const usedVars = [];
for (let word of words) {
  if (!ignoreList.has(word)) {
    usedVars.push(word);
  }
}

// Check which of these are defined locally in the block
const localRegex = /(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
const localVars = new Set();
while ((match = localRegex.exec(content)) !== null) {
  localVars.add(match[1]);
}

const externalVars = usedVars.filter(v => !localVars.has(v));
externalVars.sort();

console.log("External variables used in Onboarding:");
console.log(externalVars.join(', '));
