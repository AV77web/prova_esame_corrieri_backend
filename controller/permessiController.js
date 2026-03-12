//=================================================
// File: permessiController.js
// Script che gestisce le richieste di permesso
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================

const express = require("express");
const router = express.Router();

const permessiController = (sql) => {

    /**
     * @openapi
     * /permessi:
     *   get:
     *     summary: Ottiene tutte le richieste di permesso
     *     description: |
     *       Restituisce la lista delle richieste di permesso con filtri opzionali.
     *       - Dipendenti: vedono solo le proprie richieste
     *       - Responsabili: vedono tutte le richieste e possono filtrare per utente
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: query
     *         name: utenteId
     *         schema:
     *           type: integer
     *         description: ID dell'utente (solo per Responsabili)
     *       - in: query
     *         name: stato
     *         schema:
     *           type: string
     *           enum: [In attesa, Approvato, Rifiutato]
     *         description: Filtro per stato della richiesta
     *       - in: query
     *         name: categoriaId
     *         schema:
     *           type: integer
     *         description: Filtro per categoria di permesso
     *     responses:
     *       200:
     *         description: Lista richieste recuperata con successo
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
     *                   example: 10
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       RichiestaID:
     *                         type: integer
     *                       DataRichiesta:
     *                         type: string
     *                         format: date-time
     *                       DataInizio:
     *                         type: string
     *                         format: date
     *                       DataFine:
     *                         type: string
     *                         format: date
     *                       Motivazione:
     *                         type: string
     *                       Stato:
     *                         type: string
     *                         enum: [In attesa, Approvato, Rifiutato]
     *       401:
     *         description: Non autenticato
     *       500:
     *         description: Errore interno del server
     */
    // GET - Ottieni tutte le richieste di permesso (con filtri opzionali)
    // Dipendenti: vedono solo le proprie richieste
    // Responsabili: vedono tutte le richieste
    router.get("/", async (req, res) => {
        console.log("[PERMESSI] Richiesta lista permessi");
        const { utenteId, stato, categoriaId } = req.query;

        try {
            let result;

            // Se l'utente è un Dipendente, può vedere solo le proprie richieste
            const userUtenteId = req.user?.id ? parseInt(req.user.id) : null;
            const isResponsabile = req.user?.ruolo === "Responsabile";

            // Determina quale utenteId usare per la query
            let queryUtenteId = null;

            if (req.user?.ruolo === "Dipendente") {
                // I dipendenti possono vedere solo le proprie richieste
                queryUtenteId = userUtenteId;
            } else if (isResponsabile && utenteId) {
                // I responsabili possono filtrare per un utente specifico se richiesto
                queryUtenteId = parseInt(utenteId);
            } else if (isResponsabile) {
                // I responsabili possono vedere tutte le richieste
                queryUtenteId = null;
            } else {
                // Default: solo proprie richieste per sicurezza
                queryUtenteId = userUtenteId;
            }

            // Costruisci i filtri
            const filters = [];

            if (queryUtenteId) {
                filters.push(sql`rp."UtenteID" = ${queryUtenteId}`);
            }

            if (stato) {
                filters.push(sql`rp."Stato" = ${stato}::stato_richiesta_enum`);
            }

            if (categoriaId) {
                filters.push(sql`rp."CategoriaID" = ${parseInt(categoriaId)}`);
            }

            let whereClause = sql``;
            if (filters.length > 0) {
                // Costruisce dinamicamente "WHERE cond1 AND cond2 AND ..."
                whereClause = sql`WHERE ${filters[0]}`;
                for (let i = 1; i < filters.length; i++) {
                    whereClause = sql`${whereClause} AND ${filters[i]}`;
                }
            }

            result = await sql`
                SELECT 
                    rp."RichiestaID" as "RichiestaID", 
                    rp."DataRichiesta" as "DataRichiesta", 
                    rp."DataInizio" as "DataInizio", 
                    rp."DataFine" as "DataFine",
                    rp."Motivazione" as "Motivazione", 
                    rp."Stato" as "Stato", 
                    rp."DataValutazione" as "DataValutazione",
                    rp."UtenteID" as "UtenteID",
                    u."Nome" as "RichiedenteNome",
                    u."Cognome" as "RichiedenteCognome",
                    u."Email" as "RichiedenteEmail",
                    cp."CategoriaID" as "CategoriaID",
                    cp."Descrizione" as "CategoriaDescrizione",
                    val."Nome" as "ValutatoreNome",
                    val."Cognome" as "ValutatoreCognome"
                FROM "RichiestaPermesso" rp
                INNER JOIN "Utente" u ON rp."UtenteID" = u."UtenteID"
                INNER JOIN "CategoriaPermesso" cp ON rp."CategoriaID" = cp."CategoriaID"
                LEFT JOIN "Utente" val ON rp."UtenteValutazioneID" = val."UtenteID"
                ${whereClause}
                ORDER BY rp."DataRichiesta" DESC
            `;

            console.log(`[PERMESSI] Trovate ${result.length} richieste`);

            return res.json({
                success: true,
                count: result.length,
                data: result
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nel recupero:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /permessi/da-approvare:
     *   get:
     *     summary: Ottiene le richieste in attesa di approvazione
     *     description: Restituisce tutte le richieste di permesso con stato "In attesa". Solo i Responsabili possono accedere a questo endpoint.
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Lista richieste da approvare
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
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono vedere le richieste da approvare
     *       500:
     *         description: Errore interno del server
     */
    // GET - Elenco richieste da approvare (solo per responsabili)
    router.get("/da-approvare", async (req, res) => {
        console.log("[PERMESSI] Richiesta richieste da approvare");

        // Verifica che l'utente sia un Responsabile
        if (!req.user || req.user.ruolo !== "Responsabile") {
            return res.status(403).json({
                error: "Solo i Responsabili possono vedere le richieste da approvare"
            });
        }

        try {
            const result = await sql`
                SELECT 
                    rp."RichiestaID" as "RichiestaID", 
                    rp."DataRichiesta" as "DataRichiesta", 
                    rp."DataInizio" as "DataInizio", 
                    rp."DataFine" as "DataFine",
                    rp."Motivazione" as "Motivazione", 
                    rp."Stato" as "Stato", 
                    rp."DataValutazione" as "DataValutazione",
                    rp."UtenteID" as "UtenteID",
                    u."Nome" as "RichiedenteNome",
                    u."Cognome" as "RichiedenteCognome",
                    u."Email" as "RichiedenteEmail",
                    cp."CategoriaID" as "CategoriaID",
                    cp."Descrizione" as "CategoriaDescrizione",
                    val."Nome" as "ValutatoreNome",
                    val."Cognome" as "ValutatoreCognome"
                FROM "RichiestaPermesso" rp
                INNER JOIN "Utente" u ON rp."UtenteID" = u."UtenteID"
                INNER JOIN "CategoriaPermesso" cp ON rp."CategoriaID" = cp."CategoriaID"
                LEFT JOIN "Utente" val ON rp."UtenteValutazioneID" = val."UtenteID"
                WHERE rp."Stato" = 'In attesa'::stato_richiesta_enum
                ORDER BY rp."DataRichiesta" ASC
            `;

            console.log(`[PERMESSI] Trovate ${result.length} richieste da approvare`);

            return res.json({
                success: true,
                count: result.length,
                data: result
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nel recupero richieste da approvare:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /permessi/statistiche:
     *   get:
     *     summary: Ottiene statistiche aggregate delle richieste approvate
     *     description: Restituisce statistiche aggregate (numero richieste, giorni totali) per utente e periodo. Solo i Responsabili possono accedere a questo endpoint.
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: query
     *         name: utenteId
     *         schema:
     *           type: integer
     *         description: Filtro per ID utente specifico
     *       - in: query
     *         name: mese
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 12
     *         description: Filtro per mese (richiede anche anno)
     *       - in: query
     *         name: anno
     *         schema:
     *           type: integer
     *         description: Filtro per anno
     *     responses:
     *       200:
     *         description: Statistiche recuperate con successo
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
     *                   example: 10
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       UtenteID:
     *                         type: integer
     *                       Nome:
     *                         type: string
     *                       Cognome:
     *                         type: string
     *                       NumeroRichieste:
     *                         type: integer
     *                       GiorniTotaliRichiesti:
     *                         type: integer
     *                       GiorniTotaliApprovati:
     *                         type: integer
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono vedere le statistiche
     *       500:
     *         description: Errore interno del server
     */
    // GET - Statistiche aggregate richieste approvate (solo per responsabili) - REQUISITO AVANZATO
    router.get("/statistiche", async (req, res) => {
        console.log("[PERMESSI] Richiesta statistiche");

        // Verifica che l'utente sia un Responsabile
        if (!req.user || req.user.ruolo !== "Responsabile") {
            return res.status(403).json({
                error: "Solo i Responsabili possono vedere le statistiche"
            });
        }

        const { utenteId, mese, anno } = req.query;

        try {
            // Costruisci i filtri
            const filters = [sql`rp."Stato" = 'Approvato'::stato_richiesta_enum`];

            if (utenteId) {
                filters.push(sql`rp."UtenteID" = ${parseInt(utenteId)}`);
            }

            if (mese && anno) {
                filters.push(sql`EXTRACT(MONTH FROM rp."DataInizio") = ${parseInt(mese)}`);
                filters.push(sql`EXTRACT(YEAR FROM rp."DataInizio") = ${parseInt(anno)}`);
            } else if (anno) {
                filters.push(sql`EXTRACT(YEAR FROM rp."DataInizio") = ${parseInt(anno)}`);
            }

            let whereClause = sql``;
            if (filters.length > 0) {
                whereClause = sql`WHERE ${filters[0]}`;
                for (let i = 1; i < filters.length; i++) {
                    whereClause = sql`${whereClause} AND ${filters[i]}`;
                }
            }

            // Query per statistiche aggregate
            const result = await sql`
                SELECT 
                    u."UtenteID" as "UtenteID",
                    u."Nome" as "Nome",
                    u."Cognome" as "Cognome",
                    u."Email" as "Email",
                    COUNT(rp."RichiestaID") as "NumeroRichieste",
                    SUM(rp."DataFine" - rp."DataInizio" + 1) as "GiorniTotaliRichiesti",
                    SUM(CASE WHEN rp."Stato" = 'Approvato' THEN (rp."DataFine" - rp."DataInizio" + 1) ELSE 0 END) as "GiorniTotaliApprovati",
                    EXTRACT(MONTH FROM rp."DataInizio") as "Mese",
                    EXTRACT(YEAR FROM rp."DataInizio") as "Anno"
                FROM "RichiestaPermesso" rp
                INNER JOIN "Utente" u ON rp."UtenteID" = u."UtenteID"
                ${whereClause}
                GROUP BY u."UtenteID", u."Nome", u."Cognome", u."Email", EXTRACT(MONTH FROM rp."DataInizio"), EXTRACT(YEAR FROM rp."DataInizio")
                ORDER BY u."Cognome", u."Nome", EXTRACT(YEAR FROM rp."DataInizio") DESC, EXTRACT(MONTH FROM rp."DataInizio") DESC
            `;

            console.log(`[PERMESSI] Trovate ${result.length} statistiche aggregate`);

            return res.json({
                success: true,
                count: result.length,
                data: result.map(row => ({
                    UtenteID: row.UtenteID,
                    Nome: row.Nome,
                    Cognome: row.Cognome,
                    Email: row.Email,
                    NumeroRichieste: parseInt(row.NumeroRichieste),
                    GiorniTotaliRichiesti: parseInt(row.GiorniTotaliRichiesti),
                    GiorniTotaliApprovati: parseInt(row.GiorniTotaliApprovati),
                    Mese: row.Mese ? parseInt(row.Mese) : null,
                    Anno: row.Anno ? parseInt(row.Anno) : null
                }))
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nel recupero statistiche:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /permessi/{id}:
     *   get:
     *     summary: Ottiene una singola richiesta di permesso per ID
     *     description: |
     *       Restituisce i dettagli di una specifica richiesta di permesso.
     *       - Dipendenti: possono vedere solo le proprie richieste
     *       - Responsabili: possono vedere tutte le richieste
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID della richiesta
     *     responses:
     *       200:
     *         description: Richiesta trovata
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
     *                     RichiestaID:
     *                       type: integer
     *                     DataRichiesta:
     *                       type: string
     *                       format: date-time
     *                     Stato:
     *                       type: string
     *                       enum: [In attesa, Approvato, Rifiutato]
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Non hai i permessi per visualizzare questa richiesta
     *       404:
     *         description: Richiesta non trovata
     *       500:
     *         description: Errore interno del server
     */
    // GET - Ottieni una singola richiesta per ID
    // Dipendenti: possono vedere solo le proprie richieste
    // Responsabili: possono vedere tutte le richieste
    router.get("/:id", async (req, res) => {
        console.log("[PERMESSI] Richiesta permesso ID:", req.params.id);
        const { id } = req.params;

        try {
            const result = await sql`
                SELECT 
                    rp."RichiestaID" as "RichiestaID", 
                    rp."DataRichiesta" as "DataRichiesta", 
                    rp."DataInizio" as "DataInizio", 
                    rp."DataFine" as "DataFine",
                    rp."Motivazione" as "Motivazione", 
                    rp."Stato" as "Stato", 
                    rp."DataValutazione" as "DataValutazione",
                    rp."UtenteID" as "UtenteID",
                    u."Nome" as "RichiedenteNome",
                    u."Cognome" as "RichiedenteCognome",
                    u."Email" as "RichiedenteEmail",
                    cp."CategoriaID" as "CategoriaID",
                    cp."Descrizione" as "CategoriaDescrizione",
                    rp."UtenteValutazioneID" as "UtenteValutazioneID",
                    val."Nome" as "ValutatoreNome",
                    val."Cognome" as "ValutatoreCognome"
                FROM "RichiestaPermesso" rp
                INNER JOIN "Utente" u ON rp."UtenteID" = u."UtenteID"
                INNER JOIN "CategoriaPermesso" cp ON rp."CategoriaID" = cp."CategoriaID"
                LEFT JOIN "Utente" val ON rp."UtenteValutazioneID" = val."UtenteID"
                WHERE rp."RichiestaID" = ${id}
            `;

            if (result.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            const richiesta = result[0];

            // Verifica permessi: i dipendenti possono vedere solo le proprie richieste
            if (req.user && req.user.ruolo === "Dipendente" && richiesta.UtenteID !== req.user.id) {
                return res.status(403).json({
                    error: "Non hai i permessi per visualizzare questa richiesta"
                });
            }

            return res.json({
                success: true,
                data: richiesta
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nel recupero singolo:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /permessi:
     *   post:
     *     summary: Crea una nuova richiesta di permesso
     *     description: |
     *       Crea una nuova richiesta di permesso.
     *       - Dipendenti: possono creare solo richieste per se stessi
     *       - Responsabili: possono creare richieste per qualsiasi utente
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - dataInizio
     *               - dataFine
     *               - categoriaId
     *               - utenteId
     *             properties:
     *               dataInizio:
     *                 type: string
     *                 format: date
     *                 example: "2026-02-01"
     *                 description: Data di inizio del permesso
     *               dataFine:
     *                 type: string
     *                 format: date
     *                 example: "2026-02-05"
     *                 description: Data di fine del permesso (deve essere successiva a dataInizio)
     *               categoriaId:
     *                 type: integer
     *                 example: 1
     *                 description: ID della categoria di permesso
     *               motivazione:
     *                 type: string
     *                 example: "Vacanze estive"
     *                 description: Motivazione della richiesta (opzionale)
     *               utenteId:
     *                 type: integer
     *                 example: 1
     *                 description: ID dell'utente per cui si richiede il permesso
     *     responses:
     *       201:
     *         description: Richiesta creata con successo
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
     *                   example: Richiesta di permesso creata con successo
     *                 data:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: integer
     *                     dataRichiesta:
     *                       type: string
     *                       format: date-time
     *                     stato:
     *                       type: string
     *                       example: "In attesa"
     *       400:
     *         description: Dati mancanti o non validi
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: I dipendenti possono creare solo richieste per se stessi
     *       404:
     *         description: Categoria o utente non trovato
     *       500:
     *         description: Errore interno del server
     */
    // POST - Crea una nuova richiesta di permesso
    // Dipendenti: possono creare solo richieste per se stessi
    // Responsabili: possono creare richieste per qualsiasi utente
    router.post("/", async (req, res) => {
        console.log("[PERMESSI] Nuova richiesta permesso");
        const { dataInizio, dataFine, categoriaId, motivazione, utenteId } = req.body || {};

        // Verifica autenticazione
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                error: "Autenticazione richiesta"
            });
        }

        // Validazione campi obbligatori
        if (!dataInizio || !dataFine || !categoriaId || !utenteId) {
            return res.status(400).json({
                error: "DataInizio, DataFine, CategoriaID e UtenteID sono obbligatori"
            });
        }

        // Verifica permessi: i dipendenti possono creare solo richieste per se stessi
        if (req.user.ruolo === "Dipendente" && parseInt(utenteId) !== req.user.id) {
            return res.status(403).json({
                error: "Non hai i permessi per creare richieste per altri utenti"
            });
        }

        // Validazione date
        const inizio = new Date(dataInizio);
        const fine = new Date(dataFine);

        if (inizio >= fine) {
            return res.status(400).json({
                error: "La data di fine deve essere successiva alla data di inizio"
            });
        }

        if (inizio < new Date().setHours(0, 0, 0, 0)) {
            return res.status(400).json({
                error: "La data di inizio non può essere nel passato"
            });
        }

        try {
            // Verifica che la categoria esista
            const categoriaCheck = await sql`
                SELECT "CategoriaID" FROM "CategoriaPermesso" WHERE "CategoriaID" = ${categoriaId}
            `;

            if (categoriaCheck.length === 0) {
                return res.status(404).json({
                    error: "Categoria non trovata"
                });
            }

            // Verifica che l'utente esista
            const utenteCheck = await sql`
                SELECT "UtenteID" FROM "Utente" WHERE "UtenteID" = ${utenteId}
            `;

            if (utenteCheck.length === 0) {
                return res.status(404).json({
                    error: "Utente non trovato"
                });
            }

            // Inserisci la richiesta
            const result = await sql`
                INSERT INTO "RichiestaPermesso" 
                    ("DataInizio", "DataFine", "CategoriaID", "Motivazione", "UtenteID")
                VALUES 
                    (${dataInizio}, ${dataFine}, ${categoriaId}, ${motivazione || ''}, ${utenteId})
                RETURNING "RichiestaID", "DataRichiesta", "DataInizio", "DataFine", "CategoriaID", "Motivazione", "Stato", "UtenteID"
            `;

            const newRequest = result[0];
            console.log("[PERMESSI] Richiesta creata con ID:", newRequest.RichiestaID);

            return res.status(201).json({
                success: true,
                message: "Richiesta di permesso creata con successo",
                data: {
                    id: newRequest.RichiestaID,
                    dataRichiesta: newRequest.DataRichiesta,
                    dataInizio: newRequest.DataInizio,
                    dataFine: newRequest.DataFine,
                    categoriaId: newRequest.CategoriaID,
                    motivazione: newRequest.Motivazione,
                    stato: newRequest.Stato,
                    utenteId: newRequest.UtenteID
                }
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nella creazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /permessi/{id}:
     *   put:
     *     summary: Modifica una richiesta di permesso
     *     description: |
     *       Modifica una richiesta di permesso esistente. 
     *       - La richiesta deve essere in stato "In attesa"
     *       - I dipendenti possono modificare solo le proprie richieste
     *       - I responsabili possono modificare qualsiasi richiesta in attesa
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID della richiesta da modificare
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - dataInizio
     *               - dataFine
     *               - categoriaId
     *             properties:
     *               dataInizio:
     *                 type: string
     *                 format: date
     *                 example: "2026-02-01"
     *               dataFine:
     *                 type: string
     *                 format: date
     *                 example: "2026-02-05"
     *               categoriaId:
     *                 type: integer
     *                 example: 1
     *               motivazione:
     *                 type: string
     *                 example: "Aggiornamento motivazione"
     *     responses:
     *       200:
     *         description: Richiesta modificata con successo
     *       400:
     *         description: Dati non validi o richiesta già valutata
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Non hai i permessi per modificare questa richiesta
     *       404:
     *         description: Richiesta o categoria non trovata
     *       500:
     *         description: Errore interno del server
     */
    // PUT - Modifica una richiesta di permesso (solo se propria e in attesa)
    router.put("/:id", async (req, res) => {
        console.log("[PERMESSI] Modifica richiesta ID:", req.params.id);
        const { id } = req.params;
        const { dataInizio, dataFine, categoriaId, motivazione } = req.body || {};

        // Verifica autenticazione
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                error: "Autenticazione richiesta"
            });
        }

        // Validazione campi
        if (!dataInizio || !dataFine || !categoriaId) {
            return res.status(400).json({
                error: "DataInizio, DataFine e CategoriaID sono obbligatori"
            });
        }

        // Validazione date
        const inizio = new Date(dataInizio);
        const fine = new Date(dataFine);

        if (inizio >= fine) {
            return res.status(400).json({
                error: "La data di fine deve essere successiva alla data di inizio"
            });
        }

        try {
            // Verifica che la richiesta esista e sia in attesa
            const checkRequest = await sql`
                SELECT "RichiestaID" as "RichiestaID", "Stato" as "Stato", "UtenteID" as "UtenteID"
                FROM "RichiestaPermesso" 
                WHERE "RichiestaID" = ${id}
            `;

            if (checkRequest.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            const richiesta = checkRequest[0];

            // Verifica che la richiesta sia in attesa
            if (richiesta.Stato !== "In attesa") {
                return res.status(400).json({
                    error: "Non è possibile modificare una richiesta già valutata"
                });
            }

            // Verifica che l'utente stia modificando la propria richiesta
            // Solo i dipendenti possono modificare le proprie richieste
            if (req.user.id !== richiesta.UtenteID) {
                return res.status(403).json({
                    error: "Non hai i permessi per modificare questa richiesta"
                });
            }

            // Verifica che la categoria esista
            const categoriaCheck = await sql`
                SELECT "CategoriaID" FROM "CategoriaPermesso" WHERE "CategoriaID" = ${categoriaId}
            `;

            if (categoriaCheck.length === 0) {
                return res.status(404).json({
                    error: "Categoria non trovata"
                });
            }

            // Aggiorna la richiesta
            const result = await sql`
                UPDATE "RichiestaPermesso"
                SET 
                    "DataInizio" = ${dataInizio},
                    "DataFine" = ${dataFine},
                    "CategoriaID" = ${categoriaId},
                    "Motivazione" = ${motivazione || ''}
                WHERE "RichiestaID" = ${id}
                RETURNING 
                    "RichiestaID" as "RichiestaID", 
                    "DataRichiesta" as "DataRichiesta",
                    "DataInizio" as "DataInizio", 
                    "DataFine" as "DataFine", 
                    "CategoriaID" as "CategoriaID", 
                    "Motivazione" as "Motivazione", 
                    "Stato" as "Stato", 
                    "UtenteID" as "UtenteID"
            `;

            console.log(`[PERMESSI] Richiesta ${id} modificata con successo`);

            return res.json({
                success: true,
                message: "Richiesta modificata con successo",
                data: result[0]
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nella modifica:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /permessi/{id}/approva:
     *   put:
     *     summary: Approva una richiesta di permesso
     *     description: Approva una richiesta di permesso con stato "In attesa". Solo i Responsabili possono eseguire questa operazione.
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID della richiesta da approvare
     *     responses:
     *       200:
     *         description: Richiesta approvata con successo
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
     *                   example: Richiesta approvata con successo
     *                 data:
     *                   type: object
     *                   properties:
     *                     RichiestaID:
     *                       type: integer
     *                     Stato:
     *                       type: string
     *                       example: "Approvato"
     *                     DataValutazione:
     *                       type: string
     *                       format: date-time
     *       400:
     *         description: La richiesta è già stata valutata
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono approvare le richieste
     *       404:
     *         description: Richiesta non trovata
     *       500:
     *         description: Errore interno del server
     */
    // PUT - Approva una richiesta (solo responsabili)
    router.put("/:id/approva", async (req, res) => {
        console.log("[PERMESSI] Approvazione richiesta ID:", req.params.id);
        const { id } = req.params;

        // Verifica che l'utente sia un Responsabile
        if (!req.user || req.user.ruolo !== "Responsabile") {
            return res.status(403).json({
                error: "Solo i Responsabili possono approvare le richieste"
            });
        }

        try {
            // Verifica che la richiesta esista e sia in attesa
            const checkRequest = await sql`
                SELECT "RichiestaID", "Stato" FROM "RichiestaPermesso" WHERE "RichiestaID" = ${id}
            `;

            if (checkRequest.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            if (checkRequest[0].Stato !== "In attesa") {
                return res.status(400).json({
                    error: "La richiesta è già stata valutata"
                });
            }

            // Aggiorna la richiesta
            const result = await sql`
                UPDATE "RichiestaPermesso"
                SET 
                    "Stato" = 'Approvato'::stato_richiesta_enum,
                    "DataValutazione" = NOW(),
                    "UtenteValutazioneID" = ${req.user.id}
                WHERE "RichiestaID" = ${id}
                RETURNING 
                    "RichiestaID" as "RichiestaID", 
                    "Stato" as "Stato", 
                    "DataValutazione" as "DataValutazione", 
                    "UtenteValutazioneID" as "UtenteValutazioneID"
            `;

            console.log(`[PERMESSI] Richiesta ${id} approvata`);

            return res.json({
                success: true,
                message: "Richiesta approvata con successo",
                data: {
                    RichiestaID: result[0].RichiestaID,
                    Stato: result[0].Stato,
                    DataValutazione: result[0].DataValutazione,
                    UtenteValutazioneID: result[0].UtenteValutazioneID
                }
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nell'approvazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /permessi/{id}/rifiuta:
     *   put:
     *     summary: Rifiuta una richiesta di permesso
     *     description: Rifiuta una richiesta di permesso con stato "In attesa". Solo i Responsabili possono eseguire questa operazione.
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID della richiesta da rifiutare
     *     responses:
     *       200:
     *         description: Richiesta rifiutata con successo
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
     *                   example: Richiesta rifiutata con successo
     *                 data:
     *                   type: object
     *                   properties:
     *                     RichiestaID:
     *                       type: integer
     *                     Stato:
     *                       type: string
     *                       example: "Rifiutato"
     *                     DataValutazione:
     *                       type: string
     *                       format: date-time
     *       400:
     *         description: La richiesta è già stata valutata
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Solo i Responsabili possono rifiutare le richieste
     *       404:
     *         description: Richiesta non trovata
     *       500:
     *         description: Errore interno del server
     */
    // PUT - Rifiuta una richiesta (solo responsabili)
    router.put("/:id/rifiuta", async (req, res) => {
        console.log("[PERMESSI] Rifiuto richiesta ID:", req.params.id);
        const { id } = req.params;

        // Verifica che l'utente sia un Responsabile
        if (!req.user || req.user.ruolo !== "Responsabile") {
            return res.status(403).json({
                error: "Solo i Responsabili possono rifiutare le richieste"
            });
        }

        try {
            // Verifica che la richiesta esista e sia in attesa
            const checkRequest = await sql`
                SELECT "RichiestaID", "Stato" FROM "RichiestaPermesso" WHERE "RichiestaID" = ${id}
            `;

            if (checkRequest.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            if (checkRequest[0].Stato !== "In attesa") {
                return res.status(400).json({
                    error: "La richiesta è già stata valutata"
                });
            }

            // Aggiorna la richiesta
            const result = await sql`
                UPDATE "RichiestaPermesso"
                SET 
                    "Stato" = 'Rifiutato'::stato_richiesta_enum,
                    "DataValutazione" = NOW(),
                    "UtenteValutazioneID" = ${req.user.id}
                WHERE "RichiestaID" = ${id}
                RETURNING 
                    "RichiestaID" as "RichiestaID", 
                    "Stato" as "Stato", 
                    "DataValutazione" as "DataValutazione", 
                    "UtenteValutazioneID" as "UtenteValutazioneID"
            `;

            console.log(`[PERMESSI] Richiesta ${id} rifiutata`);

            return res.json({
                success: true,
                message: "Richiesta rifiutata con successo",
                data: {
                    RichiestaID: result[0].RichiestaID,
                    Stato: result[0].Stato,
                    DataValutazione: result[0].DataValutazione,
                    UtenteValutazioneID: result[0].UtenteValutazioneID
                }
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nel rifiuto:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    // PUT - Valuta una richiesta (approva o rifiuta) - Mantenuto per retrocompatibilità
    router.put("/:id/valuta", async (req, res) => {
        console.log("[PERMESSI] Valutazione richiesta ID:", req.params.id);
        const { id } = req.params;
        const { stato, utenteValutazioneId } = req.body || {};

        // Validazione
        if (!stato || !utenteValutazioneId) {
            return res.status(400).json({
                error: "Stato e UtenteValutazioneID sono obbligatori"
            });
        }

        if (stato !== "Approvato" && stato !== "Rifiutato") {
            return res.status(400).json({
                error: "Lo stato deve essere 'Approvato' o 'Rifiutato'"
            });
        }

        try {
            // Verifica che la richiesta esista e sia in attesa
            const checkRequest = await sql`
                SELECT "RichiestaID", "Stato" FROM "RichiestaPermesso" WHERE "RichiestaID" = ${id}
            `;

            if (checkRequest.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            if (checkRequest[0].Stato !== "In attesa") {
                return res.status(400).json({
                    error: "La richiesta è già stata valutata"
                });
            }

            // Verifica che il valutatore sia un Responsabile
            const valutatore = await sql`
                SELECT "UtenteID", "Ruolo" FROM "Utente" WHERE "UtenteID" = ${utenteValutazioneId}
            `;

            if (valutatore.length === 0) {
                return res.status(404).json({
                    error: "Valutatore non trovato"
                });
            }

            if (valutatore[0].Ruolo !== "Responsabile") {
                return res.status(403).json({
                    error: "Solo i Responsabili possono valutare le richieste"
                });
            }

            // Aggiorna la richiesta
            const result = await sql`
                UPDATE "RichiestaPermesso"
                SET 
                    "Stato" = ${stato}::stato_richiesta_enum,
                    "DataValutazione" = NOW(),
                    "UtenteValutazioneID" = ${utenteValutazioneId}
                WHERE "RichiestaID" = ${id}
                RETURNING "RichiestaID", "Stato", "DataValutazione", "UtenteValutazioneID"
            `;

            console.log(`[PERMESSI] Richiesta ${id} ${stato.toLowerCase()}`);

            return res.json({
                success: true,
                message: `Richiesta ${stato.toLowerCase()} con successo`,
                data: {
                    id: result[0].RichiestaID,
                    stato: result[0].Stato,
                    dataValutazione: result[0].DataValutazione,
                    utenteValutazioneId: result[0].UtenteValutazioneID
                }
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nella valutazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    /**
     * @openapi
     * /permessi/{id}:
     *   delete:
     *     summary: Elimina una richiesta di permesso
     *     description: |
     *       Elimina una richiesta di permesso.
     *       - Dipendenti: possono eliminare solo le proprie richieste in attesa
     *       - Responsabili: possono eliminare richieste in attesa o approvate
     *     tags:
     *       - Permessi
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID della richiesta da eliminare
     *     responses:
     *       200:
     *         description: Richiesta eliminata con successo
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
     *                   example: Richiesta eliminata con successo
     *       400:
     *         description: Non è possibile eliminare questa richiesta
     *       401:
     *         description: Non autenticato
     *       403:
     *         description: Non hai i permessi per eliminare questa richiesta
     *       404:
     *         description: Richiesta non trovata
     *       500:
     *         description: Errore interno del server
     */
    // DELETE - Elimina una richiesta
    // Dipendenti: solo se propria e in attesa
    // Responsabili: possono eliminare anche richieste approvate
    router.delete("/:id", async (req, res) => {
        console.log("[PERMESSI] Eliminazione richiesta ID:", req.params.id);
        const { id } = req.params;

        try {
            // Verifica che la richiesta esista
            const checkRequest = await sql`
                SELECT "RichiestaID", "Stato", "UtenteID" FROM "RichiestaPermesso" WHERE "RichiestaID" = ${id}
            `;

            if (checkRequest.length === 0) {
                return res.status(404).json({
                    error: "Richiesta non trovata"
                });
            }

            const richiesta = checkRequest[0];

            // Se l'utente è un Dipendente
            if (req.user && req.user.ruolo === "Dipendente") {
                // I dipendenti possono eliminare solo le proprie richieste in attesa
                if (richiesta.UtenteID !== req.user.id) {
                    return res.status(403).json({
                        error: "Non hai i permessi per eliminare questa richiesta"
                    });
                }

                if (richiesta.Stato !== "In attesa") {
                    return res.status(400).json({
                        error: "Non è possibile eliminare una richiesta già valutata"
                    });
                }
            }
            // Se l'utente è un Responsabile
            else if (req.user && req.user.ruolo === "Responsabile") {
                // I responsabili possono eliminare richieste approvate o in attesa
                if (richiesta.Stato !== "In attesa" && richiesta.Stato !== "Approvato") {
                    return res.status(400).json({
                        error: "Solo le richieste in attesa o approvate possono essere eliminate dai responsabili"
                    });
                }
            }
            // Se l'utente non è autenticato o ha un ruolo non valido
            else {
                return res.status(403).json({
                    error: "Non hai i permessi per eliminare richieste"
                });
            }

            // Elimina la richiesta
            await sql`
                DELETE FROM "RichiestaPermesso" WHERE "RichiestaID" = ${id}
            `;

            console.log(`[PERMESSI] Richiesta ${id} eliminata`);

            return res.json({
                success: true,
                message: "Richiesta eliminata con successo"
            });

        } catch (err) {
            console.error("[PERMESSI] Errore nell'eliminazione:", err);
            return res.status(500).json({
                error: "Errore interno del server",
                details: err.message
            });
        }
    });

    return router;
};

module.exports = permessiController;