import re

with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/index.html', 'r', encoding='utf-8') as f:
    index_content = f.read()

with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/css/style.css', 'r', encoding='utf-8') as f:
    css_lines = f.readlines()

css_total = len(css_lines)

def find_line(pattern, start=0):
    for i, line in enumerate(css_lines):
        if i >= start and pattern in line:
            return i
    return None

hero_start = find_line('/* ========== Hero Section ========== */')
hero_end = find_line('/* ========== Buttons ========== */') - 1
print("Hero: lines", hero_start+1, "-", hero_end+1)

prog_start = find_line('/* ========== Programme Timeline ========== */')
sched_section_start = find_line('.schedule-section', prog_start)
media_block_start = find_line('@media (max-width: 700px)', prog_start)
media_block_end = sched_section_start - 1
print("Programme: lines", prog_start+1, "-", media_block_end+1)

hero_block = ''.join(css_lines[hero_start:hero_end+1])
prog_block = ''.join(css_lines[prog_start:media_block_end+1])

scoped_css = """
  <style>
    /* --- Hero, Countdown & Programme Timeline --- */
""" + hero_block + "\n" + prog_block + """
  </style>
"""

head_end = index_content.find('</head>')
if head_end == -1:
    print("ERROR: </head> not found!")
    exit(1)

new_index = index_content[:head_end] + scoped_css + index_content[head_end:]

with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/index.html', 'w', encoding='utf-8') as f:
    f.write(new_index)
print("index.html updated [OK]")

removed_lines = set()
for i in range(hero_start, hero_end+1):
    removed_lines.add(i)
for i in range(prog_start, media_block_end+1):
    removed_lines.add(i)

new_css = [line for i, line in enumerate(css_lines) if i not in removed_lines]

with open('C:/Users/000/.openclaw/workspace/homecoming-2026/public/css/style.css', 'w', encoding='utf-8') as f:
    f.writelines(new_css)

print("style.css: removed", len(removed_lines), "lines [OK]")
print("style.css now:", len(new_css), "lines")
