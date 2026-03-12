//=================================================
// File: clienteController.js
// Gestione CRUD dei clienti del corriere
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================
/**
 * @openapi
 * components:
 *   schemas:
 *     Cliente:
 *       type: object
 *       properties:
 *         ClienteID:
 *           type: integer
 *           example: 1
 *         Nominativo:
 *           type: string
 *           example: "Mario Rossi"
 *         Via:
 *           type: string
 *           example: "Via Roma 10"
 *         Comune:
 *           type: string
 *           example: "Milano"
 *         Provincia:
 *           type: string
 *           example: "MI"
 *         Telefono:
 *           type: string
 *           example: "023456789"
 *         Email:
 *           type: string
 *           format: email
 *           example: "mario.rossi@example.com"
 *         Note:
 *           type: string
 *           nullable: true
 *           example: "Cliente storico"
 */


const express = require("express");
const router = express.Router();

const clienteController = (sql) => {

    // GET /clienti - lista completa clienti
    /**
 * @openapi
 * /clienti:
 *   get:
 *     summary: Lista completa dei clienti
 *     description: Ottieni la lista completa dei clienti.
 *     tags:
 *       - Clienti
 *     responses:
 *       200:
 *         description: Lista dei clienti recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cliente'
 *       500:
 *         description: Errore interno del server
 */
    router.get("/", async (req, res) => {
        console.log("[CLIENTE] Richiesta lista clienti");

        try {
            const result = await sql`
                SELECT 
                    clienteid  AS "ClienteID",
                    nominativo AS "Nominativo",
                    via        AS "Via",
                    comune     AS "Comune",
                    provincia  AS "Provincia",
                    telefono   AS "Telefono",
                    email      AS "Email",
                    note       AS "Note"
                FROM cliente
                ORDER BY nominativo ASC
            `;

            console.log(`[CLIENTE] Trovati ${result.length} clienti`);

            return res.json({
                success: true,
                count: result.length,
                data: result
            });

        } catch (err) {
            console.error("[CLIENTE] Errore nel recupero lista:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // GET /clienti/:id - dettaglio cliente
    /**
     /**
 * @openapi
 * /clienti/{id}:
 *   get:
 *     summary: Dettaglio cliente
 *     description: Ottieni il dettaglio di un singolo cliente tramite ID.
 *     tags:
 *       - Clienti
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Dettaglio del cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Cliente'
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore interno del server
 */
    router.get("/:id", async (req, res) => {
        console.log("[CLIENTE] Richiesto cliente ID:", req.params.id);
        const { id } = req.params;

        try {
            const result = await sql`
                SELECT 
                    clienteid  AS "ClienteID",
                    nominativo AS "Nominativo",
                    via        AS "Via",
                    comune     AS "Comune",
                    provincia  AS "Provincia",
                    telefono   AS "Telefono",
                    email      AS "Email",
                    note       AS "Note"
                FROM cliente
                WHERE clienteid = ${id}
            `;

            if (result.length === 0) {
                return res.status(404).json({
                    error: "Cliente non trovato"
                });
            }

            return res.json({
                success: true,
                data: result[0]
            });

        } catch (err) {
            console.error("[CLIENTE] Errore nel recupero singolo:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // POST /clienti - crea nuovo cliente
    /**
 * @openapi
 * /clienti:
 *   post:
 *     summary: Crea un nuovo cliente
 *     tags:
 *       - Clienti
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nominativo
 *               - via
 *             properties:
 *               nominativo:
 *                 type: string
 *               via:
 *                 type: string
 *               comune:
 *                 type: string
 *               provincia:
 *                 type: string
 *               telefono:
 *                 type: string
 *               email:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cliente creato con successo
 *       400:
 *         description: Dati mancanti o non validi
 *       409:
 *         description: Cliente già esistente
 *       500:
 *         description: Errore interno del server
 */

    router.post("/", async (req, res) => {
        console.log("[CLIENTE] Nuovo cliente");
        const { nominativo, via, comune, provincia, telefono, email, note } = req.body || {};

        if (!nominativo) {
            return res.status(400).json({
                error: "Il nominativo è obbligatorio"
            });
        }

        if (!via) {
            return res.status(400).json({
                error: "L'indirizzo (via) è obbligatorio"
            });
        }

        try {
            // Verifica se esiste già un cliente con lo stesso nominativo
            const checkExisting = await sql`
                SELECT clienteid FROM cliente
                WHERE LOWER(nominativo) = LOWER(${nominativo})
            `;

            if (checkExisting.length > 0) {
                return res.status(409).json({
                    error: "Esiste già una cliente con questo ID o nominativo"
                });
            }

            // Inserisci il nuovo cliente (ClienteID è SERIAL)
            const result = await sql`
                INSERT INTO cliente 
                    (nominativo, via, comune, provincia, telefono, email, note)
                VALUES 
                    (${nominativo}, ${via}, ${comune}, ${provincia}, ${telefono}, ${email}, ${note})
                RETURNING 
                    clienteid  AS "ClienteID",
                    nominativo AS "Nominativo",
                    via        AS "Via",
                    comune     AS "Comune",
                    provincia  AS "Provincia",
                    telefono   AS "Telefono",
                    email      AS "Email",
                    note       AS "Note"
            `;

            const newCliente = result[0];
            console.log("[CLIENTE] Cliente creato con ID:", newCliente.ClienteID);

            return res.status(201).json({
                success: true,
                message: "Cliente creato con successo",
                data: newCliente
            });

        } catch (err) {
            console.error("[CLIENTE] Errore nella creazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // PUT /clienti/:id - modifica cliente
    /**
 * @openapi
 * /clienti/{id}:
 *   put:
 *     summary: Modifica un cliente esistente
 *     tags:
 *       - Clienti
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente da modificare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nominativo
 *               - via
 *             properties:
 *               nominativo:
 *                 type: string
 *               via:
 *                 type: string
 *               comune:
 *                 type: string
 *               provincia:
 *                 type: string
 *               telefono:
 *                 type: string
 *               email:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cliente modificato con successo
 *       400:
 *         description: Dati mancanti o non validi
 *       404:
 *         description: Cliente non trovato
 *       409:
 *         description: Duplicato sul nominativo
 *       500:
 *         description: Errore interno del server
 */
    router.put("/:id", async (req, res) => {
        console.log("[CLIENTE] Modifica cliente ID:", req.params.id);
        const { id } = req.params;
        const { nominativo, via, comune, provincia, telefono, email, note } = req.body || {};

        if (!nominativo) {
            return res.status(400).json({
                error: "Il nominativo è obbligatorio"
            });
        }

        if (!via) {
            return res.status(400).json({
                error: "L'indirizzo (via) è obbligatorio"
            });
        }

        try {
            // Verifica se il cliente esiste
            const checkExists = await sql`
                SELECT clienteid FROM cliente
                WHERE clienteid = ${id}
            `;

            if (checkExists.length === 0) {
                return res.status(404).json({
                    error: "Cliente non trovato"
                });
            }

            // Verifica se esiste già un altro cliente con lo stesso nominativo
            const checkDuplicate = await sql`
                SELECT clienteid FROM cliente
                WHERE LOWER(nominativo) = LOWER(${nominativo})
                AND clienteid != ${id}
            `;

            if (checkDuplicate.length > 0) {
                return res.status(409).json({
                    error: "Esiste già un'altro cliente con questa nominativo"
                });
            }

            // Aggiorna il cliente
            const result = await sql`
                UPDATE cliente
                SET 
                    nominativo = ${nominativo},
                    via        = ${via},
                    comune     = ${comune},
                    provincia  = ${provincia},
                    telefono   = ${telefono},
                    email      = ${email},
                    note       = ${note}
                WHERE clienteid = ${id}
                RETURNING 
                    clienteid  AS "ClienteID",
                    nominativo AS "Nominativo",
                    via        AS "Via",
                    comune     AS "Comune",
                    provincia  AS "Provincia",
                    telefono   AS "Telefono",
                    email      AS "Email",
                    note       AS "Note"
            `;

            console.log("[CLIENTE] Cliente modificato con ID:", result[0].ClienteID);

            return res.json({
                success: true,
                message: "Cliente modificato con successo",
                data: result[0]
            });

        } catch (err) {
            console.error("[Cliente] Errore nella modifica:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // DELETE /clienti/:id - elimina cliente se non ha consegne associate

    /**
 * @openapi
 * /clienti/{id}:
 *   delete:
 *     summary: Elimina un cliente
 *     description: Elimina un cliente se non ha consegne associate.
 *     tags:
 *       - Clienti
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente da eliminare
 *     responses:
 *       200:
 *         description: Cliente eliminato con successo
 *       404:
 *         description: Cliente non trovato
 *       409:
 *         description: Cliente con consegne associate, impossibile eliminare
 *       500:
 *         description: Errore interno del server
 */
    router.delete("/:id", async (req, res) => {
        console.log("[CLIENTE] Eliminazione cliente ID:", req.params.id);
        const { id } = req.params;

        try {
            // Verifica se il cliente esiste
            const checkExists = await sql`
                SELECT clienteid FROM cliente
                WHERE clienteid = ${id}
            `;

            if (checkExists.length === 0) {
                return res.status(404).json({
                    error: "Cliente non trovato"
                });
            }

            // Verifica se ci sono consegne associate (vincolo applicativo)
            const checkUsage = await sql`
                SELECT COUNT(*) as count FROM consegna
                WHERE clienteid = ${id}
            `;

            if (parseInt(checkUsage[0].count) > 0) {
                return res.status(409).json({
                    error: "Impossibile eliminare: ci sono consegne associate a questo cliente",
                    details: `Trovate ${checkUsage[0].count} consegne`
                });
            }

            // Elimina il cliente
            await sql`
                DELETE FROM cliente
                WHERE clienteid = ${id}
            `;

            console.log("[CLIENTE] Cliente eliminato con ID:", id);

            return res.json({
                success: true,
                message: "Cliente eliminato con successo"
            });

        } catch (err) {
            console.error("[CLIENTE] Errore nell'eliminazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    return router;
};

module.exports = clienteController;