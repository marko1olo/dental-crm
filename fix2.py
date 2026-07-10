import sys

# Fix schedulingAlgorithms.ts
with open('apps/web/src/lib/schedulingAlgorithms.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const [hours, minutes] = timeStr.split(\':\').map(Number);\\n  return hours * 60 + minutes;', 'const [hours, minutes] = timeStr.split(\':\').map(Number);\\n  return (hours || 0) * 60 + (minutes || 0);')
content = content.replace('timeToMinutes(docWH.start)', 'timeToMinutes(docWH.start || "00:00")')
content = content.replace('timeToMinutes(chairWH.start)', 'timeToMinutes(chairWH.start || "00:00")')
content = content.replace('timeToMinutes(docWH.end)', 'timeToMinutes(docWH.end || "00:00")')
content = content.replace('timeToMinutes(chairWH.end)', 'timeToMinutes(chairWH.end || "00:00")')
content = content.replace('timeToMinutes(astWH.start)', 'timeToMinutes(astWH.start || "00:00")')
content = content.replace('timeToMinutes(astWH.end)', 'timeToMinutes(astWH.end || "00:00")')
content = content.replace('return ${d.getFullYear()}--T::00+03:00;', 'return ${d.getFullYear()}--T::00+03:00;')

with open('apps/web/src/lib/schedulingAlgorithms.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix stringUtils.ts
with open('apps/web/src/lib/stringUtils.ts', 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace('word[match.index] = \\"\\";', 'word[match.index || 0] = \\"\\";')
content2 = content2.replace('word[match.index + 1] = \\"\\";', 'word[(match.index || 0) + 1] = \\"\\";')
content2 = content2.replace('rv = match.index;', 'rv = match.index || 0;')
content2 = content2.replace('const p = match[1];', 'const p = match[1] || "";')
content2 = content2.replace('word.substr(0, match.index)', 'word.substr(0, match.index || 0)')

with open('apps/web/src/lib/stringUtils.ts', 'w', encoding='utf-8') as f:
    f.write(content2)

