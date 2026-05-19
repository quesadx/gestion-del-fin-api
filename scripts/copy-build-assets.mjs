import { mkdirSync, copyFileSync } from 'fs';
import { dirname, resolve } from 'path';

const source = resolve('src/docs/openapi.yaml');
const destination = resolve('dist/docs/openapi.yaml');

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
