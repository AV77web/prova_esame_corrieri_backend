//=================================================
// File: clienteController.js
// Script che gestisce le categorie di permesso
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================

const express = require("express");
const router = express.Router();

const clienteController = (sql) => {

    /**
     * @openapi
     * /categorie:
     *   get:
     *     summary: Ottiene tutti i clienti
     *     description: Restituisce la lista completa dei clienti ordinati per nominativo.
     *     tags:
     *       - Clienti
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Lista clienti recuperati con successo
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
     *                   example: 5
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       ClienteID:
     *                         type: integer
     *                         example: 1
     *                       Descrizione:
     *                         type: string
     *                         example: Ferie
     *       401:
     *         description: Non autenticato
     *       500:
     *         description: Errore interno del server
     */
    // GET - Ottieni tutte le categorie
    router.get("/", async (req, res) => {
        console.log("[CLIENTE] Richiesta lista cliente");

        try {
            const result = await sql`
                SELECT "ClienteID", "Nominativo" 
                FROM "Cliente"
                ORDER BY "Nominativo" ASC
            `;

            console.log(`[CLIENTE] Trovate ${result.length} cliente`);

            return res.json({
                success: true,
                count: result.length,
                data: result.map(cli => ({
                    ClienteID: cli.CategoriaID,
                    Nominativo: cli.Nominativo
                }))
            });

        } catch (err) {
            console.error("[Cliente] Errore nel recupero:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /categorie/{id}:
     *   get:
     *     summary: Ottiene un singolo cliente per ID
     *     description: Restituisce i dettagli di uno specifico cliente identificato dal suo ID.
     *     tags:
     *       - Cliente
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID del cliente
     *     responses:
     *       200:
     *         description: Cliente trovata
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     ClienteID:
     *                       type: integer
     *                       example: 1
     *                     Descrizione:
     *                       type: string
     *                       example: Mario Rossi
     *       401:
     *         description: Non autenticato
     *       404:
     *         description: Categoria non trovata
     *       500:
     *         description: Errore interno del server
     */
    // GET - Ottieni un singolo cliente per ID
    router.get("/:id", async (req, res) => {
        console.log("[CLIENTE] Richiesto cliente ID:", req.params.id);
        const { id } = req.params;

        try {
            const result = await sql`
                SELECT "ClienteID", "Nominativo" 
                FROM "Cliente"
                WHERE "ClienteID" = ${id}
            `;

            if (result.length === 0) {
                return res.status(404).json({
                    error: "Cliente non trovato"
                });
            }

            return res.json({
                success: true,
                data: {
                    ClienteID: result[0].ClienteID,
                    Nominativo: result[0].Nominativo
                }
            });

        } catch (err) {
            console.error("[CLIENTE] Errore nel recupero singolo:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /categorie:
     *   post:
     *     summary: Crea un nuovo cliente
     *     description: Crea un nuovo cliente. Solo i Responsabili possono eseguire questa operazione.
     *     tags:
     *       - Cliente
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - descrizione
     *               - clienteId
     *             properties:
     *               descrizione:
     *                 type: string
     *                 example: Mario Rossi
     *                 description: Nominatio del cliente
     *               categoriaId:
     *                 type: integer
     *                 example: 10
     *                 description: ID univoco del cliente
     *     responses:
     *       201:
     *         description: CLiente creato con successo
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: Cliente creato con successo
     *                 data:
     *                   type: object
     *                   properties:
     *                     CategoriaID:
     *                       type: integer
     *                       example: 10
     *                     Descrizione:
     *                       type: string
     *                       example: Mario Rossi
     *       400:
     *         description: Dati mancanti o non validi
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono creare clienti
     *       409:
     *         description: Esiste già un cliente con questo ID o nominativo
     *       500:
     *         description: Errore interno del server
     */
    // POST - Crea un nuovo cliente (solo Responsabile)
    router.post("/", async (req, res) => {
        console.log("[CLIENTE] Nuova cliente");
        const { nominativo, clienteId } = req.body || {};

        if (!nominativo) {
            return res.status(400).json({
                error: "Il nominativo è obbligatorio"
            });
        }

        if (!cliented) {
            return res.status(400).json({
                error: "Il ClienteID è obbligatorio"
            });
        }

        try {
            // Verifica se esiste già un cliente con lo stesso ID o nominativo
            const checkExisting = await sql`
                SELECT "ClienteID" FROM "Cliente" 
                WHERE "ClienteID" = ${clienteId} OR LOWER("Nominativo") = LOWER(${nominativo})
            `;

            if (checkExisting.length > 0) {
                return res.status(409).json({
                    error: "Esiste già una cliente con questo ID o nominativo"
                });
            }

            // Inserisci la nuova categoria
            const result = await sql`
                INSERT INTO "Cliente" ("ClienteID", "Nominativo")
                VALUES (${clienteId}, ${nominativo})
                RETURNING "ClienteID", "Nominativo"
            `;

            const newCliente = result[0];
            console.log("[CLIENTE] Cliente creato con ID:", newCliente.ClienteID);

            return res.status(201).json({
                success: true,
                message: "Cliente creato con successo",
                data: {
                    ClienteID: newCliente.ClienteID,
                    Nominativo: newCliente.Nominativo
                }
            });

        } catch (err) {
            console.error("[CLIENTE] Errore nella creazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /categorie/{id}:
     *   put:
     *     summary: Modifica un cliente esistente
     *     description: Aggiorna il nomnatiov di un cliente esistente. Solo i Responsabili possono eseguire questa operazione.
     *     tags:
     *       - Cliente
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID del Cliente da modificare
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - descrizione
     *             properties:
     *               descrizione:
     *                 type: string
     *                 example: Mario Rossi
     *                 description: Nuovo nominativo del cliente
     *     responses:
     *       200:
     *         description: Cliente modificato con successo
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: Cliente modificato con successo
     *                 data:
     *                   type: object
     *                   properties:
     *                     ClienteID:
     *                       type: integer
     *                       example: 1
     *                     Nominativo:
     *                       type: string
     *                       example: Mario Rossi
     *       400:
     *         description: Dati mancanti o non validi
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono modificare il cliente
     *       404:
     *         description: Categoria non trovata
     *       409:
     *         description: Esiste già un'altra cliente con questa nominativo
     *       500:
     *         description: Errore interno del server
     */
    // PUT - Modifica un cliente esistente (solo Responsabile)
    router.put("/:id", async (req, res) => {
        console.log("[CLIENTE] Modifica cliente ID:", req.params.id);
        const { id } = req.params;
        const { nominativo } = req.body || {};

        if (!nominativo) {
            return res.status(400).json({
                error: "Il nominativo è obbligatorio"
            });
        }

        try {
            // Verifica se la categoria esiste
            const checkExists = await sql`
                SELECT "ClienteID" FROM "Cliente" 
                WHERE "ClienteID" = ${id}
            `;

            if (checkExists.length === 0) {
                return res.status(404).json({
                    error: "Cliente non trovato"
                });
            }

            // Verifica se esiste già un altro cliente con la stessa nominativo
            const checkDuplicate = await sql`
                SELECT "ClienteID" FROM "Cliente" 
                WHERE LOWER("Nominativo") = LOWER(${nominativo}) 
                AND "ClienteID" != ${id}
            `;

            if (checkDuplicate.length > 0) {
                return res.status(409).json({
                    error: "Esiste già un'altro cliente con questa nominativo"
                });
            }

            // Aggiorna il cliente
            const result = await sql`
                UPDATE "Cliente" 
                SET "Nominativo" = ${nominativo}
                WHERE "ClienteID" = ${id}
                RETURNING "ClienteID", "Nominativo"
            `;

            console.log("[CLIENTE] Cliente modificato con ID:", result[0].CategoriaID);

            return res.json({
                success: true,
                message: "Cliente modificato con successo",
                data: {
                    ClienteID: result[0].ClienteID,
                    Nominativo: result[0].Nominativo
                }
            });

        } catch (err) {
            console.error("[Cliente] Errore nella modifica:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /categorie/{id}:
     *   delete:
     *     summary: Elimina un cliente 
     *     description: Elimina un cliente. Non è possibile eliminare cliente. Solo i Responsabili possono eseguire questa operazione.
     *     tags:
     *       - Cliente
     *     security:
     *       - cookieAuth: []
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
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: Cliente eliminato con successo
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono eliminare cliente
     *       404:
     *         description: Cliente non trovata
     *       409:
     *         description: Impossibile eliminare - ci sono consegne associate a questa cliente
     *       500:
     *         description: Errore interno del server
     */
    // DELETE - Elimina un cliente (solo Responsabile)
    router.delete("/:id", async (req, res) => {
        console.log("[CLIENTE] Eliminazione cliente ID:", req.params.id);
        const { id } = req.params;

        try {
            // Verifica se la categoria esiste
            const checkExists = await sql`
                SELECT "ClienteID" FROM "Cliente" 
                WHERE "ClienteID" = ${id}
            `;

            if (checkExists.length === 0) {
                return res.status(404).json({
                    error: "Cliente non trovato"
                });
            }

            // Verifica se ci sono richieste associate (RESTRICT constraint)
            const checkUsage = await sql`
                SELECT COUNT(*) as count FROM "Consegna" 
                WHERE "ClienteID" = ${id}
            `;

            if (parseInt(checkUsage[0].count) > 0) {
                return res.status(409).json({
                    error: "Impossibile eliminare: ci sono consegne associate a questo cliente",
                    details: `Trovate ${checkUsage[0].count} consegne`
                });
            }

            // Elimina la categoria
            await sql`
                DELETE FROM "Cliente" 
                WHERE "ClienteID" = ${id}
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