// build/extract-all.js
import fs from 'fs';
import path from 'path';
import { processHydratedFiles } from './extract-utils.js';

export async function extractAllComponents() {
  const sourceDir = './libs';
  const outputDir = './libs/blocks/dist';
  
  const blocks = {};
  // Process all hydrated files
  await processHydratedFiles(sourceDir, outputDir, blocks);
//console.log('Hydration blocks:', blocks);
  // Generate unified loader
  const baseUrl = 'https://sticky--milo--rishiithaaa.hlx.live/hydra/libs/blocks/dist/';
  const hydratedFiles = fs.readdirSync(outputDir)
    .filter(file => file.endsWith('-hydrate.js'))
    .map(file => `import('${baseUrl}${file}');`)
    .join('\n');

  fs.writeFileSync(path.join(outputDir, 'loader.js'), hydratedFiles);
  fs.writeFileSync(path.join(outputDir, 'code.json'), JSON.stringify(blocks));
}

extractAllComponents();
