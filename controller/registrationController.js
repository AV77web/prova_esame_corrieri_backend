//=================================================
// File: registrationController.js
// Script che gestisce la registrazione dell'utente
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================

const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();

const registrationController = (sql) => {
    /**
     * @openapi
     * /register:
     *   post:
     *     summary: Registra un nuovo utente
     *     description: Crea un nuovo account utente nel sistema. La password viene hashata prima del salvataggio.
     *     tags:
     *       - Autenticazione
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - nome
     *               - cognome
     *               - email
     *               - password
     *             properties:
     *               nome:
     *                 type: string
     *                 example: Mario
     *                 description: Nome dell'utente
     *               cognome:
     *                 type: string
     *                 example: Rossi
     *                 description: Cognome dell'utente
     *               email:
     *                 type: string
     *                 format: email
     *                 example: mario.rossi@example.com
     *                 description: Email dell'utente (deve essere univoca)
     *               password:
     *                 type: string
     *                 format: password
     *                 minLength: 6
     *                 example: password123
     *                 description: Password dell'utente (minimo 6 caratteri)
     *               ruolo:
     *                 type: string
     *                 enum: [Dipendente, Responsabile]
     *                 example: Dipendente
     *                 description: "Ruolo dell'utente (opzionale, default: Dipendente)"
     *     responses:
     *       201:
     *         description: Utente registrato con successo
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Utente registrato con successo
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
     *       400:
     *         description: Errore di validazione dei dati
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Nome, cognome, email e password sono obbligatorie
     *       409:
     *         description: Email già registrata
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Email già registrata
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
    // Registrazione utente
    // La rotta è POST / dato che il prefisso /register verrà usato in index.js
    router.post("/", async (req, res) => {
        console.log("[REGISTRAZIONE] Richiesta ricevuta");
        const { nome, cognome, email, password, ruolo } = req.body || {};

        // Validazione campi obbligatori
        if (!email || !password) {
            return res.status(400).json({
                error: "Email e password sono obbligatorie"
            });
        }

        // Validazione del ruolo (se fornito) - viene mappato sul flag Admin
        if (ruolo && ruolo !== "Dipendente" && ruolo !== "Responsabile" && ruolo !== "Operatore" && ruolo !== "Amministratore") {
            return res.status(400).json({
                error: "Il ruolo deve essere 'Dipendente', 'Responsabile', 'Operatore' o 'Amministratore'"
            });
        }

        // Validazione formato email (base)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: "Formato email non valido"
            });
        }

        // Validazione lunghezza password
        if (password.length < 6) {
            return res.status(400).json({
                error: "La password deve essere di almeno 6 caratteri"
            });
        }

        try {
            // Verifica se l'email esiste già
            console.log("[REGISTRAZIONE] Verifica email:", email);
            console.log("[REGISTRAZIONE] Dati ricevuti:", { nome, cognome, email, ruolo });
            const checkResult = await sql`
                SELECT email 
                FROM utente 
                WHERE email = ${email}
            `;

            if (checkResult.length > 0) {
                console.log("[REGISTRAZIONE] Email già registrata:", email);
                return res.status(409).json({
                    error: "Email già registrata"
                });
            }

            // Hash della password
            console.log("[REGISTRAZIONE] Hashing password...");
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Calcola il flag Admin a partire dal ruolo (se fornito)
            const isAdmin =
                ruolo === "Responsabile" ||
                ruolo === "Amministratore" ||
                ruolo === "Admin";

            const adminValue = isAdmin ? "true" : "false";

            // Inserisci il nuovo utente nel database (schema: UtenteID, Email, Password, Admin)
            const result = await sql`
                INSERT INTO utente (email, password, admin)
                VALUES (${email}, ${hashedPassword}, ${adminValue})
                RETURNING 
                    utenteid AS "UtenteID",
                    email    AS "Email",
                    admin    AS "Admin"
            `;

            const newUser = result[0];
            console.log("[REGISTRAZIONE] Utente creato con successo - ID:", newUser.UtenteID);

            // Ruolo logico usato dal frontend e dal token
            const ruoloLogico = (newUser.Admin === true || newUser.Admin === "true" || newUser.Admin === "1")
                ? "Amministratore"
                : "Operatore";

            // Restituisci i dati dell'utente creato (senza password)
            return res.status(201).json({
                message: "Utente registrato con successo",
                user: {
                    id: newUser.UtenteID,
                    // nome/cognome non sono più salvati nel DB, ma li rimandiamo al client se forniti
                    nome: nome || "",
                    cognome: cognome || "",
                    email: newUser.Email,
                    ruolo: ruoloLogico
                }
            });

        } catch (err) {
            console.error("[REGISTRAZIONE] Errore durante la registrazione:", err);

            // Gestisci errori specifici di PostgreSQL
            if (err.code === '23505') { // Unique violation
                return res.status(409).json({
                    error: "Email già registrata"
                });
            }

            if (err.code === '22001') { // String too long
                return res.status(400).json({
                    error: "Uno dei campi supera la lunghezza massima consentita"
                });
            }

            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    return router;
};

module.exports = registrationController;