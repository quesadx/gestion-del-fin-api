import swaggerJSDoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 3000;
const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.1.1',
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
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['message', 'statusCode'],
              properties: {
                message: { type: 'string', example: 'Validation failed' },
                statusCode: { type: 'integer', example: 400 },
                details: {
                  description: 'Validation or database metadata details when available',
                  nullable: true,
                },
              },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 1,
              maxLength: 60,
              example: 'admin',
            },
            password: {
              type: 'string',
              minLength: 1,
              example: 'my-secure-password',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          required: ['user', 'token'],
          properties: {
            user: {
              type: 'object',
              required: ['username'],
              properties: {
                username: { type: 'string', example: 'admin' },
              },
            },
            token: {
              type: 'string',
              description: 'JWT access token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        SystemTimeResponse: {
          type: 'object',
          required: ['now', 'iso', 'today'],
          properties: {
            now: {
              type: 'string',
              description: 'Server local time',
              example: '14:05:30',
            },
            iso: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-25T14:05:30.000Z',
            },
            today: {
              type: 'string',
              format: 'date',
              example: '2026-04-25',
            },
          },
        },
      },
    },
    tags: [
      { name: 'System', description: 'System and health-related endpoints' },
      { name: 'Auth', description: 'Authentication and session endpoints' },
      { name: 'Camps', description: 'Camp management endpoints' },
      { name: 'Resources', description: 'Resource catalog endpoints' },
      { name: 'People', description: 'People management endpoints' },
      { name: 'Inventory', description: 'Inventory and audit endpoints' },
      { name: 'Admission', description: 'Admission workflow endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Professions', description: 'Profession catalog endpoints' },
      { name: 'Explorations', description: 'Exploration lifecycle endpoints' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './dist/modules/**/*.routes.js'],
});
