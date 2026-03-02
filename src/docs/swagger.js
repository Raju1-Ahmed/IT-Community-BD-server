import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "IT Community BD API",
      version: "1.0.0",
      description: "MERN job portal backend API documentation"
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        AuthRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 }
          }
        },
        RegisterRequest: {
          allOf: [
            { $ref: "#/components/schemas/AuthRequest" },
            {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
                role: { type: "string", enum: ["seeker", "employer", "admin"] },
                companyName: { type: "string" }
              }
            }
          ]
        },
        JobRequest: {
          type: "object",
          required: ["title", "companyName", "location", "jobType", "experienceLevel", "description"],
          properties: {
            title: { type: "string" },
            companyName: { type: "string" },
            location: { type: "string" },
            jobType: { type: "string", enum: ["full-time", "part-time", "contract", "internship", "remote"] },
            experienceLevel: { type: "string", enum: ["fresher", "junior", "mid", "senior"] },
            salaryMin: { type: "number" },
            salaryMax: { type: "number" },
            skills: { type: "array", items: { type: "string" } },
            description: { type: "string" }
          }
        },
        ApplicationRequest: {
          type: "object",
          properties: {
            coverLetter: { type: "string" },
            resumeUrl: { type: "string" }
          }
        }
      }
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "API health check",
          responses: {
            200: { description: "API is healthy" }
          }
        }
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" }
              }
            }
          },
          responses: { 201: { description: "Registered" } }
        }
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthRequest" }
              }
            }
          },
          responses: { 200: { description: "Login success" } }
        }
      },
      "/api/jobs": {
        get: {
          tags: ["Jobs"],
          summary: "List active jobs",
          responses: { 200: { description: "Jobs list" } }
        },
        post: {
          tags: ["Jobs"],
          summary: "Create a job (employer/admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JobRequest" }
              }
            }
          },
          responses: { 201: { description: "Job created" } }
        }
      },
      "/api/jobs/{id}": {
        get: {
          tags: ["Jobs"],
          summary: "Get job details",
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Job details" } }
        }
      },
      "/api/applications/job/{id}": {
        post: {
          tags: ["Applications"],
          summary: "Apply to job (seeker/admin)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApplicationRequest" }
              }
            }
          },
          responses: { 201: { description: "Applied" } }
        }
      },
      "/api/admin/stats": {
        get: {
          tags: ["Admin"],
          summary: "Get platform stats (admin only)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Stats" } }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
