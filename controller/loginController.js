//=================================================
// File: loginController.js
// Script che gestisce il login dell'utente
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const loginController = (sql) => {
    /**
     * @openapi
     * /login:
     *   post:
     *     summary: Effettua il login di un utente
     *     description: Autentica un utente tramite email e password. Restituisce un JWT token salvato in un cookie HttpOnly.
     *     tags:
     *       - Autenticazione
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *                 description: Email dell'utente
     *               password:
     *                 type: string
     *                 format: password
     *                 example: password123
     *                 description: Password dell'utente
     *     responses:
     *       200:
     *         description: Login effettuato con successo. Il token JWT è salvato in un cookie HttpOnly.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Login effettuato con successo
     *                 user:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: integer
     *                       example: 1
     *                     nome:
     *                       type: string
     *                       example: Mario
     *                     cognome:
     *                       type: string
     *                       example: Rossi
     *                     email:
     *                       type: string
     *                       example: user@example.com
     *                     ruolo:
     *                       type: string
     *                       enum: [Dipendente, Responsabile]
     *                       example: Dipendente
     *         headers:
     *           Set-Cookie:
     *             description: Cookie HttpOnly contenente il JWT token
     *             schema:
     *               type: string
     *       400:
     *         description: Email e password sono obbligatorie
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Email e password sono obbligatorie
     *       401:
     *         description: Credenziali non valide
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Credenziali non valide
     *       500:
     *         description: Errore interno del server
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Errore interno del server
     *                 details:
     *                   type: string
     */
    // Login utente
    // La rotta è POST / dato che il prefisso /login verrà usato in index.js
    router.post("/", async (req, res) => {
        console.log("[LOGIN] Richiesta ricevuta");
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Email e password sono obbligatorie" });
        }

        try {
            // Cerca l'utente per email nella tabella Utente
            const result = await sql`
                SELECT "UtenteID", "Nome", "Cognome", "Email", "Password", "Ruolo" 
                FROM "Utente" 
                WHERE "Email" = ${email}
            `;

            if (result.length === 0) {
                console.log("[LOGIN] Utente non trovato:", email);
                // Messaggio generico per non rivelare se l'utente esiste o meno
                return res.status(401).json({ error: "Credenziali non valide" });
            }

            const utente = result[0];

            // Confronta la password fornita con l'hash salvato nel DB
            const passwordMatch = await bcrypt.compare(password, utente.Password);
            if (!passwordMatch) {
                console.log("[LOGIN] Password errata per:", email);
                return res.status(401).json({ error: "Credenziali non valide" });
            }

            console.log("[LOGIN] Autenticazione riuscita per:", email);

            // Genera il Token JWT per la gestione della Session
            const token = jwt.sign(
                {
                    id: utente.UtenteID,
                    email: utente.Email,
                    nome: utente.Nome,
                    cognome: utente.Cognome,
                    ruolo: utente.Ruolo
                },
                process.env.JWT_SECRET || "segreto_super_sicuro_da_cambiare",
                { expiresIn: "24h" } // 24 ore
            );
            console.log("[LOGIN] Token generato con successo");

            const isProduction = process.env.NODE_ENV === "production";
            console.log(`[LOGIN] Configurazione Cookie - Production: ${isProduction}, SameSite: ${isProduction ? "none" : "lax"}`);

            // Imposta il cookie HttpOnly
            res.cookie("token", token, {
                httpOnly: true, // Fondamentale: impedisce l'accesso via JS
                secure: isProduction, // Usa HTTPS in produzione
                maxAge: 86400000, // 24 ore in millisecondi
                sameSite: isProduction ? "none" : "lax" // "none" per cross-site (Vercel->Render), "lax" per localhost
            });
            console.log("[LOGIN] Cookie HttpOnly impostato nella risposta");

            // Login successo: restituisce un messaggio e i dati utente (senza password)
            return res.json({
                message: "Login effettuato con successo",
                user: {
                    id: utente.UtenteID,
                    nome: utente.Nome,
                    cognome: utente.Cognome,
                    email: utente.Email,
                    ruolo: utente.Ruolo
                }
            });
        } catch (err) {
            console.error("Errore durante il login:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    return router;
};

module.exports = loginController;