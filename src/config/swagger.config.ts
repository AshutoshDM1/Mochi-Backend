import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';
// Import all Swagger documentation files
import '../docs/swagger';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Mochi API',
    version: '1.0.0',
    description: 'An Express + TypeScript backend with cron jobs for site monitoring',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'General',
      description: 'General API endpoints',
    },
    {
      name: 'URLs',
      description: 'URL management endpoints',
    },
    {
      name: 'Cron Jobs',
      description: 'Cron job management endpoints',
    },
  ],
  components: {
    securitySchemes: {
      UsernameAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-username',
        description: 'Username for authentication',
      },
    },
  },
  security: [
    {
      UsernameAuth: [],
    },
  ],
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/docs/swagger/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
