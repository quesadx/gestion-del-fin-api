import { readFileSync, readdirSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OPENAPI_DIR = resolve(__dirname, 'openapi');
const PATHS_DIR = join(OPENAPI_DIR, 'paths');
const COMPONENTS_DIR = join(OPENAPI_DIR, 'components');

let doc: Record<string, unknown> = {};

try {
  const openapiPath = join(OPENAPI_DIR, 'openapi.yaml');
  if (existsSync(openapiPath)) {
    doc = yaml.load(readFileSync(openapiPath, 'utf8')) as Record<string, unknown>;
  }

  const schemasPath = join(COMPONENTS_DIR, 'schemas.yaml');
  if (existsSync(schemasPath)) {
    const schemasFile = yaml.load(readFileSync(schemasPath, 'utf8')) as Record<string, unknown>;
    const schemas = schemasFile?.schemas;
    if (schemas && typeof schemas === 'object') {
      doc.components = { ...(doc.components as object || {}), schemas };
    }
  }

  const paths: Record<string, unknown> = {};
  if (existsSync(PATHS_DIR)) {
    const files = readdirSync(PATHS_DIR).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const filePath = join(PATHS_DIR, file);
      const pathDefs = yaml.load(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
      if (pathDefs && typeof pathDefs === 'object') {
        Object.assign(paths, pathDefs);
      }
    }
  }
  doc.paths = paths;
} catch (error) {
  console.warn('[Swagger] docs disabled', error instanceof Error ? error.message : error);
}

const PORT = process.env.PORT || 3000;
const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

if (doc && typeof doc === 'object') {
  doc.servers = [{ url: baseUrl, description: 'Server' }];
}

export const swaggerSpec = doc;
