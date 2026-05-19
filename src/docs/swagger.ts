import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const yamlPath = resolve(__dirname, 'openapi.yaml');

let doc: Record<string, unknown> = {};

try {
  const rawYaml = readFileSync(yamlPath, 'utf8');
  doc = yaml.load(rawYaml) as Record<string, unknown>;
} catch (error) {
  console.warn('[Swagger] docs disabled', error instanceof Error ? error.message : error);
}

const PORT = process.env.PORT || 3000;
const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

if (doc && typeof doc === 'object') {
  doc.servers = [{ url: baseUrl, description: 'Server' }];
}

export const swaggerSpec = doc;
