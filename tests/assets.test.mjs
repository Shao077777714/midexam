import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=async relative=>JSON.parse(await readFile(path.join(root,relative),'utf8'));

function jpegDimensions(bytes){
  let offset=2;
  while(offset<bytes.length){
    while(bytes[offset]===0xff)offset++;
    const marker=bytes[offset++];
    if(marker===0xda||marker===0xd9)break;
    const segmentLength=bytes.readUInt16BE(offset);
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
      return {width:bytes.readUInt16BE(offset+5),height:bytes.readUInt16BE(offset+3)};
    }
    offset+=segmentLength;
  }
  throw new Error('JPEG dimensions not found');
}

test('reference image pack preserves all 13 supplied JPEGs and their source metadata',async()=>{
  const manifest=await readJson('assets/manifest.json');
  assert.equal(manifest.references.length,13,'all user-supplied reference images must be indexed');

  const filenames=Array.from({length:13},(_,i)=>`LINE_ALBUM_2026.10.29_261105_${i+1}.jpg`);
  assert.deepEqual(manifest.references.map(image=>image.sourceFilename).sort(),filenames.sort());

  for(const image of manifest.references){
    assert.equal(image.status,'reference-only');
    assert.equal(image.generated,false);
    assert.ok(image.label,'each reference image needs a descriptive label');
    assert.ok(image.purpose,'each reference image needs its intended use');
    assert.ok(Number.isInteger(image.width)&&image.width>0,'image width must be recorded');
    assert.ok(Number.isInteger(image.height)&&image.height>0,'image height must be recorded');
    assert.ok(/^[a-f0-9]{64}$/.test(image.sha256),'SHA-256 must be recorded');

    const imagePath=path.resolve(root,image.path);
    assert.ok(imagePath.startsWith(path.join(root,'assets','reference-images')+path.sep),'reference images must stay inside assets/reference-images');
    const bytes=await readFile(imagePath);
    assert.equal(bytes.length,image.bytes,`${image.sourceFilename}: byte count mismatch`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),image.sha256,`${image.sourceFilename}: SHA-256 mismatch`);
    assert.deepEqual(jpegDimensions(bytes),{width:image.width,height:image.height},`${image.sourceFilename}: dimensions mismatch`);
    assert.equal(bytes[0],0xff,`${image.sourceFilename}: missing JPEG SOI marker`);
    assert.equal(bytes[1],0xd8,`${image.sourceFilename}: missing JPEG SOI marker`);
  }
});
