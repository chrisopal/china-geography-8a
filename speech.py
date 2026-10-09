"""Generate only known curriculum cues; cache is keyed by text, model and voice."""
import hashlib
import json
import os
from pathlib import Path
import re
import threading
from urllib import request

ROOT = Path(__file__).resolve().parent
MODEL = os.environ.get('OPENROUTER_TTS_MODEL', 'qwen/qwen-audio-3.0-tts-plus')
VOICE = os.environ.get('OPENROUTER_TTS_VOICE', 'longanlingxin')
LOCK = threading.Lock()


def path_for(step):
    if not re.fullmatch(r'[a-z0-9-]+', step['cue']):
        raise ValueError('Invalid cue')
    digest = hashlib.sha256((MODEL+'\n'+VOICE+'\n'+step['text']).encode()).hexdigest()[:16]
    return ROOT / 'audio' / f'{step["cue"]}-{digest}.mp3'


def available(course):
    return {s['cue']: '/audio/'+path_for(s).name for n in course['nodes'] for s in n['steps'] if path_for(s).is_file()}


def generate(step, key):
    path = path_for(step)
    result = {'url':'/audio/'+path.name, 'cue':step['cue'], 'model':MODEL, 'voice':VOICE, 'cached':True}
    if path.is_file():
        return result
    if not LOCK.acquire(blocking=False):
        raise BlockingIOError('Another clip is generating')
    try:
        if path.is_file():
            return result
        payload = {'model':MODEL, 'voice':VOICE, 'input':step['text'], 'response_format':'mp3'}
        req = request.Request('https://openrouter.ai/api/v1/audio/speech', data=json.dumps(payload).encode(),
                              headers={'Authorization':'Bearer '+key, 'Content-Type':'application/json'}, method='POST')
        with request.urlopen(req, timeout=50) as response:
            audio = response.read(10*1024*1024+1)
            if len(audio)<500 or len(audio)>10*1024*1024 or audio.lstrip().startswith((b'{',b'[')):
                raise ValueError('Invalid audio response')
        path.parent.mkdir(exist_ok=True)
        temp = path.with_suffix('.part')
        temp.write_bytes(audio)
        temp.replace(path)
        result['cached'] = False
        return result
    finally:
        LOCK.release()
