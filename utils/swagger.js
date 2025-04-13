import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HikeApp API',
      version: '1.0.0',
      description: 'API we made for our hiking app during MTAA course',
    },
    servers: [
      {
        url: `http://localhost:${process.env.SERVER_PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: [path.resolve(__dirname, '../routes/*.routes.js')], // ✅ absolute path
};


const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerDocs = (app,port) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
};

export default swaggerDocs;
