import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
course = json.loads((root / 'curriculum.json').read_text())
nodes = course['nodes']
assert len(course['chapters']) == 5
assert len(nodes) >= 65, f'incomplete course: {len(nodes)}'
ids = [n['id'] for n in nodes]
assert len(ids) == len(set(ids))
sources = {s['id'] for s in course['sources']}
cues = []
report = []
for chapter in course['chapters']:
    for section in chapter['sections']:
        members = [n for n in nodes if n['section'] == section['id']]
        assert members, f'empty section: {section["title"]}'
        assert all(n['chapter'] == chapter['id'] for n in members)
        report.append({'chapter': chapter['title'], 'section': section['title'], 'nodes': len(members)})
for n in nodes:
    assert n['scene'] in ('china','monsoon','river','land','resources','transport','ecology')
    assert n['layer'] in ('terrain','provinces','population','climate','rivers','agriculture','industry','resources','ecology')
    assert len(n['steps']) == 3 and len(n['summary']) > 10 and len(n['explanation']) > 120
    assert n['misconception'] and n['question']
    for i, step in enumerate(n['steps']):
        assert len(step['text']) > 35
        assert step['cue'] == f'{n["id"]}-{i+1:02}'
        cues.append(step['cue'])
    for related in n['related']:
        assert related in ids and related != n['id'], f'{n["id"]}: invalid related {related}'
    assert n['sources'] and set(n['sources']) <= sources
    assert all(s['url'].startswith('https://') for s in course['sources'])
    for key in ('interaction', 'quiz'):
        item = n[key]
        assert len(item['options']) >= 3 and 0 <= item['answer'] < len(item['options'])
    for choice in n['interaction']['options']:
        assert choice['label'] and choice['feedback'] and choice['value'] in (0,50,100)
assert len(set(cues)) == len(cues)
print(json.dumps({'chapters':len(course['chapters']),'sections':len(report),'nodes':len(nodes),'narrationCues':len(cues),'exercises':len(nodes)*2,'scenes':sorted({n['scene'] for n in nodes}),'danglingReferences':0}, ensure_ascii=False))
(root / 'evidence/curriculum-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
