/**
 * Swagger / OpenAPI Configuration
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library Management System API',
      version: '1.0.0',
      description:
        'Complete RESTful API for the Library Management System. Supports authentication, book management, borrowing operations, user management, and reporting.',
      contact: {
        name: 'Library API Support',
        email: 'admin@library.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? process.env.BACKEND_URL || 'https://your-api.onrender.com'
          : `http://localhost:${process.env.PORT || 5000}`,
        description:
          process.env.NODE_ENV === 'production'
            ? 'Production Server'
            : 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 10 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Books', description: 'Book management endpoints' },
      { name: 'Categories', description: 'Category management endpoints' },
      { name: 'Borrowing', description: 'Borrowing operations endpoints' },
      { name: 'Reports', description: 'Reports and analytics endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/docs/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
