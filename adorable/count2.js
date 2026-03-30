const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer/cjs');

const targetDir = 'C:\\\\Users\\\\affan\\\\Affan Projects\\\\samaa\\\\connectit\\\\quickapp\\\\examples\\\\instagram_clone_generated';

function walkDir(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      if (['build', '.dart_tool', 'web', '.flutter-plugins', '.flutter-plugins-dependencies'].includes(file)) return;
      
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) { 
        results = results.concat(walkDir(fullPath));
      } else { 
        if (file.endsWith('.dart') || file.endsWith('.yaml') || file.endsWith('.html') || file.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    });
  } catch(e) {
    if (e.code !== 'ENOENT') console.error(e);
  }
  return results;
}

const files = walkDir(targetDir);
let totalTokens = 0;
let fileStats = [];

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const tokens = encode(content).length;
    totalTokens += tokens;
    const lines = content.split('\n').length;
    fileStats.push({ path: file.substring(targetDir.length + 1).replace(/\\/g, '/'), lines, tokens });
  } catch(e) {}
});

console.log(JSON.stringify({ totalTokens, totalFiles: files.length, files: fileStats.sort((a,b) => b.tokens - a.tokens) }, null, 2));
