import swaggerJSDoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 3000;
const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`; // TODO: add PUBLIC_BASE_URL to .env

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.2.0',
    info: {
      title: 'Gestion Del Fin API',
      version: '1.0.0',
      description: 'API documentation for Gestion Del Fin',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: { type: 'string' },
              example: ['name is required'],
            },
          },
        },
      },
    },
    tag: [
      { name: 'System', description: 'System related endpoints' },
      { name: 'Auth', description: 'Authentication & Session related endpoints' },
      { name: 'Camps', description: 'Camps related endpoints' },
      { name: 'Resources', description: 'Resources related endpoints' },
      { name: 'People', description: 'People related endpoints' },
      { name: 'inventory', description: 'Inventory related endpoints' },
      { name: 'Admission', description: 'Admission related endpoints' },
      { name: 'Users', description: 'Users related endpoints' },
      { name: 'Roles', description: 'Roles related endpoints' },
      { name: 'Professions', description: 'Professions related endpoints' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './dist/modules/**/*.routes.js'],
});
