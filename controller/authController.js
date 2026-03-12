//=================================================
// File: authController.js
// Script che gestisce la verifica dell'autenticazione e il logout
// @author: Full Stack Senior Developer
// @version: 1.0.0 2026-01-14
// =================================================

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const authController = (sql) => {
    // sql è opzionale, non viene usato in questo controller
    // ma lo accettiamo per consistenza con gli altri controller

    /**
     * @openapi
     * /auth/me:
     *   get:
     *     summary: Ottiene i dati dell'utente autenticato
     *     description: Restituisce le informazioni dell'utente correntemente autenticato tramite il JWT token presente nel cookie HttpOnly.
     *     tags:
     *       - Autenticazione
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Dati utente autenticato
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 authenticated:
     *                   type: boolean
     *                   example: true
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
     *                       example: mario.rossi@example.com
     *                     ruolo:
     *                       type: string
     *                       enum: [Dipendente, Responsabile]
     *                       example: Dipendente
     *       401:
     *         description: Non autenticato - token mancante o non valido
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Token non valido
     */
    // Verifica lo stato di autenticazione (protetto dal middleware)
    // GET /me - Restituisce i dati dell'utente autenticato
    router.get("/me", authMiddleware, (req, res) => {
        console.log("[AUTH] Verifica autenticazione richiesta");

        // req.user è stato popolato dal middleware authMiddleware
        // che ha decodificato il JWT dal cookie HttpOnly
        return res.json({
            authenticated: true,
            user: {
                id: req.user.id,
                nome: req.user.nome,
                cognome: req.user.cognome,
                email: req.user.email,
                ruolo: req.user.ruolo
            }
        });
    });

    /**
     * @openapi
     * /auth/logout:
     *   post:
     *     summary: Effettua il logout dell'utente
     *     description: Cancella il cookie HttpOnly contenente il JWT token di autenticazione.
     *     tags:
     *       - Autenticazione
     *     responses:
     *       200:
     *         description: Logout effettuato con successo
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Logout effettuato con successo
     *         headers:
     *           Set-Cookie:
     *             description: "Cookie HttpOnly cancellato (maxAge: 0)"
     *             schema:
     *               type: string
     */
    // Logout - Cancella il cookie di autenticazione
    // POST /logout
    router.post("/logout", (req, res) => {
        console.log("[AUTH] Logout richiesto");

        // Cancella il cookie impostandolo con maxAge 0
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        });

        console.log("[AUTH] Cookie rimosso con successo");

        return res.json({
            message: "Logout effettuato con successo"
        });
    });

    return router;
};

module.exports = authController;
