//=================================================
// File: categorieController.js
// Script che gestisce le categorie di permesso
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================

const express = require("express");
const router = express.Router();

const categorieController = (sql) => {

    /**
     * @openapi
     * /categorie:
     *   get:
     *     summary: Ottiene tutte le categorie di permesso
     *     description: Restituisce la lista completa delle categorie di permesso ordinate per descrizione.
     *     tags:
     *       - Categorie
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Lista categorie recuperata con successo
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
     *                       CategoriaID:
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
        console.log("[CATEGORIE] Richiesta lista categorie");

        try {
            const result = await sql`
                SELECT "CategoriaID", "Descrizione" 
                FROM "CategoriaPermesso"
                ORDER BY "Descrizione" ASC
            `;

            console.log(`[CATEGORIE] Trovate ${result.length} categorie`);

            return res.json({
                success: true,
                count: result.length,
                data: result.map(cat => ({
                    CategoriaID: cat.CategoriaID,
                    Descrizione: cat.Descrizione
                }))
            });

        } catch (err) {
            console.error("[CATEGORIE] Errore nel recupero:", err);
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
     *     summary: Ottiene una singola categoria per ID
     *     description: Restituisce i dettagli di una specifica categoria di permesso identificata dal suo ID.
     *     tags:
     *       - Categorie
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID della categoria
     *     responses:
     *       200:
     *         description: Categoria trovata
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
     *                     CategoriaID:
     *                       type: integer
     *                       example: 1
     *                     Descrizione:
     *                       type: string
     *                       example: Ferie
     *       401:
     *         description: Non autenticato
     *       404:
     *         description: Categoria non trovata
     *       500:
     *         description: Errore interno del server
     */
    // GET - Ottieni una singola categoria per ID
    router.get("/:id", async (req, res) => {
        console.log("[CATEGORIE] Richiesta categoria ID:", req.params.id);
        const { id } = req.params;

        try {
            const result = await sql`
                SELECT "CategoriaID", "Descrizione" 
                FROM "CategoriaPermesso"
                WHERE "CategoriaID" = ${id}
            `;

            if (result.length === 0) {
                return res.status(404).json({
                    error: "Categoria non trovata"
                });
            }

            return res.json({
                success: true,
                data: {
                    CategoriaID: result[0].CategoriaID,
                    Descrizione: result[0].Descrizione
                }
            });

        } catch (err) {
            console.error("[CATEGORIE] Errore nel recupero singolo:", err);
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
     *     summary: Crea una nuova categoria di permesso
     *     description: Crea una nuova categoria di permesso. Solo i Responsabili possono eseguire questa operazione.
     *     tags:
     *       - Categorie
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
     *               - categoriaId
     *             properties:
     *               descrizione:
     *                 type: string
     *                 example: Permesso per motivi personali
     *                 description: Descrizione della categoria
     *               categoriaId:
     *                 type: integer
     *                 example: 10
     *                 description: ID univoco della categoria
     *     responses:
     *       201:
     *         description: Categoria creata con successo
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
     *                   example: Categoria creata con successo
     *                 data:
     *                   type: object
     *                   properties:
     *                     CategoriaID:
     *                       type: integer
     *                       example: 10
     *                     Descrizione:
     *                       type: string
     *                       example: Permesso per motivi personali
     *       400:
     *         description: Dati mancanti o non validi
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono creare categorie
     *       409:
     *         description: Esiste già una categoria con questo ID o descrizione
     *       500:
     *         description: Errore interno del server
     */
    // POST - Crea una nuova categoria (solo Responsabile)
    router.post("/", async (req, res) => {
        console.log("[CATEGORIE] Nuova categoria");
        const { descrizione, categoriaId } = req.body || {};

        if (!descrizione) {
            return res.status(400).json({
                error: "La descrizione è obbligatoria"
            });
        }

        if (!categoriaId) {
            return res.status(400).json({
                error: "Il CategoriaID è obbligatorio"
            });
        }

        try {
            // Verifica se esiste già una categoria con lo stesso ID o descrizione
            const checkExisting = await sql`
                SELECT "CategoriaID" FROM "CategoriaPermesso" 
                WHERE "CategoriaID" = ${categoriaId} OR LOWER("Descrizione") = LOWER(${descrizione})
            `;

            if (checkExisting.length > 0) {
                return res.status(409).json({
                    error: "Esiste già una categoria con questo ID o descrizione"
                });
            }

            // Inserisci la nuova categoria
            const result = await sql`
                INSERT INTO "CategoriaPermesso" ("CategoriaID", "Descrizione")
                VALUES (${categoriaId}, ${descrizione})
                RETURNING "CategoriaID", "Descrizione"
            `;

            const newCategory = result[0];
            console.log("[CATEGORIE] Categoria creata con ID:", newCategory.CategoriaID);

            return res.status(201).json({
                success: true,
                message: "Categoria creata con successo",
                data: {
                    CategoriaID: newCategory.CategoriaID,
                    Descrizione: newCategory.Descrizione
                }
            });

        } catch (err) {
            console.error("[CATEGORIE] Errore nella creazione:", err);
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
     *     summary: Modifica una categoria esistente
     *     description: Aggiorna la descrizione di una categoria esistente. Solo i Responsabili possono eseguire questa operazione.
     *     tags:
     *       - Categorie
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID della categoria da modificare
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
     *                 example: Ferie annuali
     *                 description: Nuova descrizione della categoria
     *     responses:
     *       200:
     *         description: Categoria modificata con successo
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
     *                   example: Categoria modificata con successo
     *                 data:
     *                   type: object
     *                   properties:
     *                     CategoriaID:
     *                       type: integer
     *                       example: 1
     *                     Descrizione:
     *                       type: string
     *                       example: Ferie annuali
     *       400:
     *         description: Dati mancanti o non validi
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono modificare categorie
     *       404:
     *         description: Categoria non trovata
     *       409:
     *         description: Esiste già un'altra categoria con questa descrizione
     *       500:
     *         description: Errore interno del server
     */
    // PUT - Modifica una categoria esistente (solo Responsabile)
    router.put("/:id", async (req, res) => {
        console.log("[CATEGORIE] Modifica categoria ID:", req.params.id);
        const { id } = req.params;
        const { descrizione } = req.body || {};

        if (!descrizione) {
            return res.status(400).json({
                error: "La descrizione è obbligatoria"
            });
        }

        try {
            // Verifica se la categoria esiste
            const checkExists = await sql`
                SELECT "CategoriaID" FROM "CategoriaPermesso" 
                WHERE "CategoriaID" = ${id}
            `;

            if (checkExists.length === 0) {
                return res.status(404).json({
                    error: "Categoria non trovata"
                });
            }

            // Verifica se esiste già un'altra categoria con la stessa descrizione
            const checkDuplicate = await sql`
                SELECT "CategoriaID" FROM "CategoriaPermesso" 
                WHERE LOWER("Descrizione") = LOWER(${descrizione}) 
                AND "CategoriaID" != ${id}
            `;

            if (checkDuplicate.length > 0) {
                return res.status(409).json({
                    error: "Esiste già un'altra categoria con questa descrizione"
                });
            }

            // Aggiorna la categoria
            const result = await sql`
                UPDATE "CategoriaPermesso" 
                SET "Descrizione" = ${descrizione}
                WHERE "CategoriaID" = ${id}
                RETURNING "CategoriaID", "Descrizione"
            `;

            console.log("[CATEGORIE] Categoria modificata con ID:", result[0].CategoriaID);

            return res.json({
                success: true,
                message: "Categoria modificata con successo",
                data: {
                    CategoriaID: result[0].CategoriaID,
                    Descrizione: result[0].Descrizione
                }
            });

        } catch (err) {
            console.error("[CATEGORIE] Errore nella modifica:", err);
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
     *     summary: Elimina una categoria di permesso
     *     description: Elimina una categoria di permesso. Non è possibile eliminare categorie associate a richieste di permesso. Solo i Responsabili possono eseguire questa operazione.
     *     tags:
     *       - Categorie
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID della categoria da eliminare
     *     responses:
     *       200:
     *         description: Categoria eliminata con successo
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
     *                   example: Categoria eliminata con successo
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono eliminare categorie
     *       404:
     *         description: Categoria non trovata
     *       409:
     *         description: Impossibile eliminare - ci sono richieste associate a questa categoria
     *       500:
     *         description: Errore interno del server
     */
    // DELETE - Elimina una categoria (solo Responsabile)
    router.delete("/:id", async (req, res) => {
        console.log("[CATEGORIE] Eliminazione categoria ID:", req.params.id);
        const { id } = req.params;

        try {
            // Verifica se la categoria esiste
            const checkExists = await sql`
                SELECT "CategoriaID" FROM "CategoriaPermesso" 
                WHERE "CategoriaID" = ${id}
            `;

            if (checkExists.length === 0) {
                return res.status(404).json({
                    error: "Categoria non trovata"
                });
            }

            // Verifica se ci sono richieste associate (RESTRICT constraint)
            const checkUsage = await sql`
                SELECT COUNT(*) as count FROM "RichiestaPermesso" 
                WHERE "CategoriaID" = ${id}
            `;

            if (parseInt(checkUsage[0].count) > 0) {
                return res.status(409).json({
                    error: "Impossibile eliminare: ci sono richieste associate a questa categoria",
                    details: `Trovate ${checkUsage[0].count} richieste`
                });
            }

            // Elimina la categoria
            await sql`
                DELETE FROM "CategoriaPermesso" 
                WHERE "CategoriaID" = ${id}
            `;

            console.log("[CATEGORIE] Categoria eliminata con ID:", id);

            return res.json({
                success: true,
                message: "Categoria eliminata con successo"
            });

        } catch (err) {
            console.error("[CATEGORIE] Errore nell'eliminazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    return router;
};

module.exports = categorieController;