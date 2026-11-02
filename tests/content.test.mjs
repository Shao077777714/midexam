import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=async relative=>JSON.parse(await readFile(path.join(root,relative),'utf8'));

test('content pack has five ordered levels with narrative, clues, three non-answer hints, and answers',async()=>{
  const levels=await Promise.all(Array.from({length:5},(_,i)=>readJson(`content/level-${i+1}.json`)));
  assert.deepEqual(levels.map(level=>level.id),['level-1','level-2','level-3','level-4','level-5']);
  for(const level of levels){
    assert.ok(level.title&&level.story?.dreamcore&&level.story?.afterPuzzle,'each level needs story text');
    assert.ok(level.clues.length>0,'each level needs clues');
    assert.equal(level.hints.length,3,'each puzzle must have exactly three graduated hints');
    assert.ok(level.answer?.summary&&level.answer?.steps?.length,'each puzzle needs an answer and solution steps');
    const hintText=level.hints.join(' ');
    assert.ok(!hintText.includes(level.answer.summary),'hints must not contain the answer text');
    for(const step of level.answer.steps)assert.ok(!level.hints.includes(step),'hints must guide without copying a full answer step');
    const descriptiveText=[level.title,level.trigger,...Object.values(level.story),level.flowchart_text,...level.clues,...level.hints,level.answer.summary,...level.answer.steps].join(' ');
    const missing=level.flowchart_items.filter(item=>!descriptiveText.includes(item));
    assert.deepEqual(missing,[],`flowchart items missing from story/clues/hints/answer text in ${level.id}`);
  }
});

test('asset manifest points to existing deployed files and separates planned assets',async()=>{
  const manifest=await readJson('assets/manifest.json');
  assert.ok(manifest.available.images.length>0);
  assert.ok(manifest.available.audio.length>0);
  for(const asset of [...manifest.available.images,...manifest.available.audio]){
    assert.ok(asset.path,'asset needs a repository path');
    await readFile(path.join(root,asset.path));
    assert.ok(asset.purpose,'asset needs a usage description');
  }
  for(const asset of manifest.planned)assert.ok(asset.purpose&&asset.status==='planned');
});
