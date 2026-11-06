import os
import re

patterns = [
    ('Private Key', re.compile(r'-----BEGIN [A-Z ]+PRIVATE KEY-----')),
    ('GitHub Token', re.compile(r'(gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{82})')),
    ('AWS Access Key', re.compile(r'AKIA[0-9A-Z]{16}')),
    ('Google API Key', re.compile(r'AIza[0-9A-Za-z\-_]{35}')),
    ('Slack Token', re.compile(r'xox[baprs]-[0-9]{12}-[0-9]{12}-[0-9a-zA-Z]{24}')),
    ('Generic Password/Secret', re.compile(r'''(?i)(api[_-]?key|secret[_-]?key|private[_-]?key|password|auth[_-]?token)\s*[:=]\s*['"][^'"]{8,}['"]''')),
    ('Bearer Token', re.compile(r'''(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}''')),
]

ignore_dirs = {'.git', 'node_modules', '.venv', 'dist', '__pycache__', '.pytest_cache'}
ignore_exts = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.ttf', '.woff', '.woff2', '.sqlite', '.sqlite-wal', '.sqlite-shm', '.min.js'}

findings = []

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    for file in files:
        ext = os.path.splitext(file)[1].lower()
        if ext in ignore_exts:
            continue
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                for name, pat in patterns:
                    for match in pat.finditer(content):
                        line_no = content[:match.start()].count('\n') + 1
                        matched_str = match.group(0)[:60]
                        findings.append((filepath, line_no, name, matched_str))
        except Exception as e:
            pass

print(f"Total potential secret findings: {len(findings)}")
for path, line, name, val in findings:
    print(f"{path}:{line} [{name}] -> {val}")
