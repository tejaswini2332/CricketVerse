import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const src = '/Users/tejaswinikunkulagunta/Desktop/CricketVerse_Blockchain_dummy_v2.pptx';
const out = '/Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/.presentation-build-academic';
const deck = await PresentationFile.importPptx(await FileBlob.load(src));
console.log('slides', deck.slides.items.length);
const result = await deck.inspect({ kind: 'slide,textbox,shape,image,table,chart,notes', maxChars: 50000 });
await fs.writeFile(`${out}/reference-inspect.ndjson`, result.ndjson);
for (const [i, slide] of deck.slides.items.entries()) {
  const blob = await deck.export({ slide, format: 'png', scale: 0.6 });
  await fs.writeFile(`${out}/reference-${String(i+1).padStart(2, '0')}.png`, new Uint8Array(await blob.arrayBuffer()));
}
