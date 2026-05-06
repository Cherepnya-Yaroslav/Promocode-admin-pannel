import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const fileStats = statSync(fullPath);

    if (fileStats.isDirectory()) {
      return collectTypeScriptFiles(fullPath);
    }

    if (
      fullPath.endsWith('.spec.ts') ||
      fullPath.endsWith('.e2e-spec.ts')
    ) {
      return [];
    }

    return fullPath.endsWith('.ts') ? [fullPath] : [];
  });
}

describe('Analytics architecture', () => {
  it('does not import MongoDB or Mongoose inside the analytics module', () => {
    const analyticsDirectory = join(__dirname);
    const analyticsFiles = collectTypeScriptFiles(analyticsDirectory);
    const forbiddenPatterns = [
      '@nestjs/mongoose',
      'mongoose',
      'database/schemas',
      'MongoModelsModule',
      'InjectModel'
    ];

    for (const filePath of analyticsFiles) {
      const contents = readFileSync(filePath, 'utf8');

      for (const pattern of forbiddenPatterns) {
        expect(contents.includes(pattern)).toBe(false);
      }
    }
  });
});
