import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const yamlPath = resolve(__dirname, 'openapi.yaml');
const doc = load(readFileSync(yamlPath, 'utf8')) as Record<string, unknown>;

const PORT = process.env.PORT || 3000;
const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

doc.servers = [{ url: baseUrl, description: 'Server' }];

export const swaggerSpec = doc;
