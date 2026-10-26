const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "URL Shortener API",
      version: "1.0.0",
      description: "A professional URL shortening service API",
      contact: {
        name: "API Support",
        email: "support@urlshortener.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
        description: "Development server",
      },
      {
        url: "https://api.urlshortener.com/api/v1",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ShortenUrlRequest: {
          type: "object",
          required: ["longUrl"],
          properties: {
            longUrl: {
              type: "string",
              example: "https://example.com/very/long/url",
              description: "The original URL to shorten",
            },
            customAlias: {
              type: "string",
              example: "my-custom-link",
              description: "Optional custom short code (4-30 chars)",
            },
            method: {
              type: "string",
              enum: ["sequential", "random", "hash"],
              default: "random",
              description: "Shortening method to use",
            },
            expiresIn: {
              type: "integer",
              minimum: 1,
              maximum: 365,
              description: "Expiry in days (optional)",
            },
          },
        },
        ShortenUrlResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                shortCode: { type: "string", example: "abc123" },
                shortUrl: {
                  type: "string",
                  example: "http://localhost:5000/abc123",
                },
                longUrl: {
                  type: "string",
                  example: "https://example.com/very/long/url",
                },
                clicks: { type: "integer", example: 0 },
                createdAt: { type: "string", format: "date-time" },
              },
            },
            message: { type: "string", example: "URL shortened successfully" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            statusCode: { type: "integer" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
    tags: [
      {
        name: "URLs",
        description: "URL shortening operations",
      },
      {
        name: "Users",
        description: "User management",
      },
      {
        name: "Analytics",
        description: "Click analytics and statistics",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"], // Path to API docs
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerDocs = (app, port) => {
  // Swagger page
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Docs in JSON format
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log(`📚 Swagger docs available at http://localhost:${port}/api-docs`);
};

module.exports = swaggerDocs;
