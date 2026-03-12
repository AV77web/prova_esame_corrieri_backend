//=====================================================
// File: swagger.js
// Configurazione Swagger/OpenAPI per documentazione API
//@author: andrea.villari@allievi.itsdigitalacademy.com
//@version "1.0.0 2026-01-14"
//=====================================================

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

/**
 * Configura e restituisce la specifica Swagger
 */
const getSwaggerSpec = () => {
  // URL del backend - usa variabile d'ambiente, o URL di produzione, o localhost in sviluppo
  const isProduction = process.env.NODE_ENV === 'production';
  const backendUrl = process.env.BACKEND_URL ||
    (isProduction ? "https://prova-esame-s1-backend.onrender.com" : "http://localhost:3000");

  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "API Docs",
        version: "1.0.0",
        description: "Documentazione API del backend su Render",
        contact: {
          name: "API Support",
          email: "villari.andra@libero.it"
        }
      },
      servers: [
        {
          url: backendUrl,
          description: process.env.NODE_ENV === 'production'
            ? "Server di produzione (Render)"
            : "Server di sviluppo (localhost)"
        },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "token",
            description: "Autenticazione tramite cookie HttpOnly"
          }
        }
      }
    },
    apis: [
      "./controller/*.js",  // Scan dei commenti JSDoc nei controller
      "./index.js"          // Scan dei commenti JSDoc in index.js
    ],
  };

  return swaggerJsdoc(options);
};

/**
 * Configura Swagger nell'app Express
 * @param {Express} app - Istanza dell'app Express
 */
const setupSwagger = (app) => {
  const swaggerSpec = getSwaggerSpec();

  // Route per la documentazione Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "API Documentation"
  }));

  // Route JSON per la specifica OpenAPI
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log(`[SWAGGER] Documentazione disponibile su /api-docs`);
  console.log(`[SWAGGER] JSON spec disponibile su /api-docs.json`);
};

module.exports = { setupSwagger };
