//=====================================================
// File: index.js
// Script che gestisce la logica del backend
//@author: andrea.villari@allievi.itsdigitalacademy.com
//@version "1.0.0 2026-01-14"
//=====================================================

require("dotenv").config();
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const { neon } = require("@neondatabase/serverless")
const cors = require("cors");
const { FRONTEND_URL: DEFAULT_FRONTEND_URL } = require("./config");
const loginController = require("./controller/loginController");
const registrationController = require("./controller/registrationController");
const authController = require("./controller/authController");
const authMiddleware = require("./middleware/authMiddleware");
const permessiController = require("./controller/permessiController");
const categorieController = require("./controller/categorieController");
const { verifyToken, verifyRole } = require("./middleware/authMiddleware");
const { setupSwagger } = require("./swagger");
const port = process.env.PORT || 3000;

// FRONTEND_URL da Environment Variable ha priorità su config.js
const FRONTEND_URL = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;

console.log(`[CORS] Frontend URL configurato: ${FRONTEND_URL}`);

app.use(cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}
));

const sql = neon(process.env.DATABASE_URL);

app.use(express.json());
app.use(cookieParser()); // Necessario per leggere req.cookies

/**
 * @openapi
 * /:
 *   get:
 *     summary: Health check endpoint
 *     description: Verifica che il server sia attivo
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server attivo
 *         content:
 *           text/plain:
 *             example: Hello World
 */
app.get("/", (req, res) => {
    res.send("Hello World");
});

// Swagger Docs - deve essere configurato dopo express.json() e prima delle routes
setupSwagger(app);

app.use("/login", loginController(sql));
app.use("/register", registrationController(sql));
app.use("/auth", authController(sql));
app.use("/permessi", verifyToken, permessiController(sql));
app.use("/categorie", verifyToken, categorieController(sql));


app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
});
