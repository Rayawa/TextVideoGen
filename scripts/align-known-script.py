"""Force-align approved text with existing local WhisperX models; no ASR/VAD/downloads."""
import json
import os
import sys
from pathlib import Path

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
import torch
import whisperx

torch.set_num_threads(4)
audio_path, cues_path, output_path = map(Path, sys.argv[1:])
if output_path.exists():
    raise RuntimeError(f'Refusing to overwrite {output_path}')
source = json.loads(cues_path.read_text())
audio = whisperx.load_audio(str(audio_path))
duration = len(audio) / whisperx.audio.SAMPLE_RATE
text = ''.join(c['text'] for c in source['captions'])
model, metadata = whisperx.load_align_model('zh', 'cpu', model_dir=os.environ['WHISPERX_MODEL_DIR'], model_cache_only=True)
result = whisperx.align([{'start': 0, 'end': duration, 'text': text}], model, metadata, audio, 'cpu', return_char_alignments=True)
chars = [char for segment in result['segments'] for char in segment.get('chars', [])]
if ''.join(c['char'] for c in chars) != text:
    raise RuntimeError('Alignment character stream differs from approved script')
offset = 0
comparisons = []
for cue in source['captions']:
    part = chars[offset:offset + len(cue['text'])]
    offset += len(cue['text'])
    timed = [c for c in part if 'start' in c and 'end' in c]
    if not timed:
        raise RuntimeError(f'No aligned characters in cue {cue["index"]}')
    comparisons.append({'index': cue['index'], 'text': cue['text'], 'start': timed[0]['start'], 'end': timed[-1]['end'], 'sourceStart': cue['start'], 'sourceEnd': cue['end'], 'startDeltaMs': round((timed[0]['start'] - cue['start']) * 1000), 'timedCharacters': len(timed)})
result.update({'method': 'WhisperX forced alignment of exact source text, local cached Chinese model, no VAD or ASR', 'model': metadata.get('type'), 'durationSeconds': duration, 'cueComparisons': comparisons})
output_path.parent.mkdir(parents=True, exist_ok=True)
with output_path.open('x') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(json.dumps({'durationSeconds': duration, 'cues': len(comparisons), 'maxStartDeltaMs': max(abs(c['startDeltaMs']) for c in comparisons)}, ensure_ascii=False))
