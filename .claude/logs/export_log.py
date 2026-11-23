"""Writes every prompt and response of the GMAtlas Claude Code sessions to
.claude/logs/<session-id>.md (user prompts and Claude's text replies; tool
calls and tool output are left out). Run: python -I export_log.py [session-id]
With no id, every session transcript is exported. Safe to re-run: each file
is rewritten in full from its transcript."""
import json, os, re, sys

PROJ = os.path.expanduser(r'~\.claude\projects\c--Dev-GMAtlas')
OUT = os.path.dirname(os.path.abspath(__file__))
REMINDER = re.compile(r'<system-reminder>.*?</system-reminder>', re.S)
SKIP_PREFIX = ('<command-', '<local-command', 'Caveat:', '[Request interrupted')


def text_of(content):
    if isinstance(content, str):
        return content
    parts = []
    for b in content or []:
        if isinstance(b, dict) and b.get('type') == 'text':
            parts.append(b.get('text', ''))
    return '\n\n'.join(parts)


def export(sid):
    src = os.path.join(PROJ, sid + '.jsonl')
    rows = []
    with open(src, encoding='utf8') as f:
        for line in f:
            try:
                r = json.loads(line)
            except ValueError:
                continue
            if r.get('isSidechain') or r.get('isMeta'):
                continue
            t = r.get('type')
            if t not in ('user', 'assistant'):
                continue
            msg = r.get('message') or {}
            content = msg.get('content')
            if t == 'user' and isinstance(content, list) and any(
                    isinstance(b, dict) and b.get('type') == 'tool_result' for b in content):
                continue
            txt = REMINDER.sub('', text_of(content)).strip()
            if not txt or txt.startswith(SKIP_PREFIX):
                continue
            if r.get('isCompactSummary'):
                txt = '_(Context summary inserted after compaction)_\n\n' + txt
            rows.append((t, r.get('timestamp', ''), txt))
    out = os.path.join(OUT, sid + '.md')
    with open(out, 'w', encoding='utf8') as f:
        f.write(f'# Session {sid}\n\n')
        last = None
        for t, ts, txt in rows:
            who = 'Prompt' if t == 'user' else 'Response'
            if who == last == 'Response':
                f.write(txt + '\n\n')
            else:
                f.write(f'## {who} ({ts[:19].replace("T", " ")} UTC)\n\n{txt}\n\n')
            last = who
    return out, len(rows)


if __name__ == '__main__':
    ids = sys.argv[1:] or [n[:-6] for n in os.listdir(PROJ) if n.endswith('.jsonl')]
    for sid in ids:
        print(*export(sid))
