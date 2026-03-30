import { encode } from "gpt-tokenizer";
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "fs";
import { join, basename } from "path";

const INSTAGRAM_PATH = "C:/Users/affan/Affan Projects/samaa/connectit/quickapp/examples/instagram_clone_generated";
const OUTPUT_PATH = "./lib/instagram-clone-manifest.json";

interface FileInfo {
  path: string;
  name: string;
  lines: number;
  tokens: number;
  size: number;
}

interface LayerInfo {
  files: number;
  lines: number;
  tokens: number;
}

function scanDirectory(dir: string, baseDir: string = dir): FileInfo[] {
  const results: FileInfo[] = [];

  if (!existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    return results;
  }

  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);

    try {
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...scanDirectory(fullPath, baseDir));
      } else if (item.endsWith(".dart")) {
        const content = readFileSync(fullPath, "utf-8");
        const lines = content.split("\n").length;
        const tokens = encode(content).length;
        const relativePath = fullPath.replace(baseDir, "").replace(/^[/\\]/, "").replace(/\\/g, "/");

        results.push({
          path: relativePath,
          name: item,
          lines,
          tokens,
          size: stat.size,
        });
      }
    } catch (err) {
      console.warn(`⚠️  Could not process: ${fullPath}`);
    }
  }

  return results;
}

function categorizeFiles(files: FileInfo[]): Record<string, LayerInfo> {
  const layers: Record<string, LayerInfo> = {
    bloc: { files: 0, lines: 0, tokens: 0 },
    data: { files: 0, lines: 0, tokens: 0 },
    presentation: { files: 0, lines: 0, tokens: 0 },
    main: { files: 0, lines: 0, tokens: 0 },
    other: { files: 0, lines: 0, tokens: 0 },
  };

  for (const file of files) {
    let layer = "other";
    if (file.path.startsWith("lib/bloc/")) {
      layer = "bloc";
    } else if (file.path.startsWith("lib/data/")) {
      layer = "data";
    } else if (file.path.startsWith("lib/presentation/")) {
      layer = "presentation";
    } else if (file.path.startsWith("lib/main.dart") || file.path.startsWith("lib/")) {
      layer = "main";
    }

    layers[layer].files++;
    layers[layer].lines += file.lines;
    layers[layer].tokens += file.tokens;
  }

  return layers;
}

function main() {
  console.log("🔍 Scanning Instagram clone directory...");
  console.log(`   Path: ${INSTAGRAM_PATH}`);

  const files = scanDirectory(INSTAGRAM_PATH);

  if (files.length === 0) {
    console.log("❌ No Dart files found!");
    process.exit(1);
  }

  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const layers = categorizeFiles(files);

  const manifest = {
    metadata: {
      totalFiles: files.length,
      totalLines,
      totalTokens,
      totalSize,
      estimatedFlutterTokens: Math.round(totalTokens * 1.2),
      compressionRatio: Math.round((1 - 2509 / (totalTokens * 1.2)) * 100),
      path: INSTAGRAM_PATH,
      generatedAt: new Date().toISOString(),
    },
    layers,
    files: files.map((f) => ({
      path: f.path,
      name: f.name,
      lines: f.lines,
      tokens: f.tokens,
    })),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2));

  console.log("\n✅ Token manifest generated successfully!");
  console.log(`   Output: ${OUTPUT_PATH}\n`);
  console.log("📊 Summary:");
  console.log(`   Files:    ${files.length}`);
  console.log(`   Lines:    ${totalLines.toLocaleString()}`);
  console.log(`   Tokens:   ${totalTokens.toLocaleString()}`);
  console.log(`   Size:     ${(totalSize / 1024).toFixed(1)} KB\n`);
  console.log("📁 By Layer:");
  for (const [layer, info] of Object.entries(layers)) {
    console.log(`   ${layer}: ${info.files} files, ${info.lines.toLocaleString()} lines, ${info.tokens.toLocaleString()} tokens`);
  }
}

main();
