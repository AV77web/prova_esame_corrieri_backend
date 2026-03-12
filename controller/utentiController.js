//=================================================
// File: utentiController.js
// Gestione CRUD degli utenti di sistema (solo Amministratore)
//=================================================

/**
 * @openapi
 * components:
 *   schemas:
 *     Utente:
 *       type: object
 *       properties:
 *         UtenteID:
 *           type: integer
 *           example: 1
 *         Email:
 *           type: string
 *           format: email
 *           example: admin@example.com
 *         Admin:
 *           type: boolean
 *           example: true
 */

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const utentiController = (sql) => {
  /**
   * GET /utenti
   * Restituisce la lista degli utenti senza password.
   */
  /**
 * @openapi
 * /utenti:
 *   get:
 *     summary: Lista utenti
 *     description: Restituisce la lista degli utenti (senza password).
 *     tags:
 *       - Utenti
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista degli utenti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Utente'
 *       500:
 *         description: Errore interno del server
 */
  router.get("/", async (_req, res) => {
    console.log("[UTENTI] Richiesta lista utenti");

    try {
      const result = await sql`
        SELECT 
          utenteid AS "UtenteID",
          email    AS "Email",
          admin    AS "Admin"
        FROM utente
        ORDER BY utenteid ASC
      `;

      return res.json({
        success: true,
        count: result.length,
        data: result,
      });
    } catch (err) {
      console.error("[UTENTI] Errore nel recupero lista:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  /**
   * POST /utenti
   * Crea un nuovo utente.
   * Body: { email, password, admin }
   */
  /**
 * @openapi
 * /utenti:
 *   post:
 *     summary: Crea un nuovo utente
 *     tags:
 *       - Utenti
 *     security:
 *       - cookieAuth: []
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
 *               password:
 *                 type: string
 *                 format: password
 *               admin:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Utente creato con successo
 *       400:
 *         description: Dati mancanti o non validi
 *       409:
 *         description: Email già registrata
 *       500:
 *         description: Errore interno del server
 */
  router.post("/", async (req, res) => {
    console.log("[UTENTI] Creazione nuovo utente");

    const { email, password, admin } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email e password sono obbligatorie",
      });
    }

    try {
      const checkExisting = await sql`
        SELECT email
        FROM utente
        WHERE email = ${email}
      `;

      if (checkExisting.length > 0) {
        return res.status(409).json({ error: "Email già registrata" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const adminValue =
        admin === true || admin === "true" || admin === "1" ? "true" : "false";

      const result = await sql`
        INSERT INTO utente (email, password, admin)
        VALUES (${email}, ${hashedPassword}, ${adminValue})
        RETURNING utenteid AS "UtenteID", email AS "Email", admin AS "Admin"
      `;

      return res.status(201).json({
        success: true,
        message: "Utente creato con successo",
        data: result[0],
      });
    } catch (err) {
      console.error("[UTENTI] Errore nella creazione:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  /**
   * PUT /utenti/:id
   * Modifica email / password / admin di un utente.
   */
  /**
 * @openapi
 * /utenti/{id}:
 *   put:
 *     summary: Modifica un utente
 *     tags:
 *       - Utenti
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dell'utente da modificare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               admin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Utente modificato con successo
 *       400:
 *         description: Dati mancanti o non validi
 *       404:
 *         description: Utente non trovato
 *       409:
 *         description: Email già in uso
 *       500:
 *         description: Errore interno del server
 */
  router.put("/:id", async (req, res) => {
    console.log("[UTENTI] Modifica utente ID:", req.params.id);
    const { id } = req.params;
    const { email, password, admin } = req.body || {};

    const utenteId = parseInt(id, 10);
    if (Number.isNaN(utenteId)) {
      return res.status(400).json({ error: "UtenteID non valido" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email è obbligatoria" });
    }

    try {
      const checkExists = await sql`
        SELECT utenteid
        FROM utente
        WHERE utenteid = ${utenteId}
      `;

      if (checkExists.length === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      const checkDuplicate = await sql`
        SELECT utenteid
        FROM utente
        WHERE LOWER(email) = LOWER(${email}) AND utenteid != ${utenteId}
      `;

      if (checkDuplicate.length > 0) {
        return res.status(409).json({ error: "Esiste già un utente con questa email" });
      }

      let hashedPasswordFragment = sql``;
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        hashedPasswordFragment = sql`, password = ${hashedPassword}`;
      }

      const adminValue =
        admin === true || admin === "true" || admin === "1" ? "true" : "false";

      const result = await sql`
        UPDATE utente
        SET email = ${email},
            admin = ${adminValue}
            ${hashedPasswordFragment}
        WHERE utenteid = ${utenteId}
        RETURNING utenteid AS "UtenteID", email AS "Email", admin AS "Admin"
      `;

      return res.json({
        success: true,
        message: "Utente modificato con successo",
        data: result[0],
      });
    } catch (err) {
      console.error("[UTENTI] Errore nella modifica:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  /**
   * DELETE /utenti/:id
   * Elimina un utente.
   */
  /**
 * @openapi
 * /utenti/{id}:
 *   delete:
 *     summary: Elimina un utente
 *     tags:
 *       - Utenti
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID dell'utente da eliminare
 *     responses:
 *       200:
 *         description: Utente eliminato con successo
 *       400:
 *         description: ID non valido
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore interno del server
 */
  router.delete("/:id", async (req, res) => {
    console.log("[UTENTI] Eliminazione utente ID:", req.params.id);
    const { id } = req.params;

    const utenteId = parseInt(id, 10);
    if (Number.isNaN(utenteId)) {
      return res.status(400).json({ error: "UtenteID non valido" });
    }

    try {
      const result = await sql`
        DELETE FROM utente
        WHERE utenteid = ${utenteId}
        RETURNING utenteid
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      return res.json({
        success: true,
        message: "Utente eliminato con successo",
      });
    } catch (err) {
      console.error("[UTENTI] Errore nell'eliminazione:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  return router;
};

module.exports = utentiController;

