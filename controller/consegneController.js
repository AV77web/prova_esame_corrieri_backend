//=================================================
// File: consegneController.js
// Gestione CRUD delle consegne dei corrieri
//=================================================

/**
 * @openapi
 * components:
 *   schemas:
 *     Consegna:
 *       type: object
 *       properties:
 *         ConsegnaID:
 *           type: integer
 *           example: 10
 *         ClienteID:
 *           type: integer
 *           example: 1
 *         ClienteNominativo:
 *           type: string
 *           example: "Mario Rossi"
 *         ClienteComune:
 *           type: string
 *           example: "Milano"
 *         ClienteProvincia:
 *           type: string
 *           example: "MI"
 *         DataRitiro:
 *           type: string
 *           format: date-time
 *         DataConsegna:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         Stato:
 *           type: string
 *           example: "in consegna"
 *         ChiaveConsegna:
 *           type: string
 *           example: "ABC123"
 */

const express = require("express");
const router = express.Router();

/**
 * Stati gestiti dall'applicazione:
 * - da ritirare
 * - in deposito
 * - in consegna
 * - consegnato
 * - in giacenza
 */
const STATI_CONSEGNA = [
  "da ritirare",
  "in deposito",
  "in consegna",
  "consegnato",
  "in giacenza",
];

const consegneController = (sql) => {
  /**
   * GET /consegne
   * Lista delle consegne con filtri opzionali:
   * - clienteId
   * - stato
   */
  /**
 * @openapi
 * /consegne:
 *   get:
 *     summary: Lista delle consegne
 *     description: Restituisce la lista delle consegne, con filtri opzionali per cliente e stato.
 *     tags:
 *       - Consegne
 *     parameters:
 *       - in: query
 *         name: clienteId
 *         schema:
 *           type: integer
 *         required: false
 *         description: ID del cliente
 *       - in: query
 *         name: stato
 *         schema:
 *           type: string
 *         required: false
 *         description: Stato della consegna
 *     responses:
 *       200:
 *         description: Lista delle consegne
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
 *                     $ref: '#/components/schemas/Consegna'
 *       500:
 *         description: Errore interno del server
 */
  router.get("/", async (req, res) => {
    console.log("[CONSEGNE] Richiesta lista consegne");

    const { clienteId, stato } = req.query;

    try {
      const filters = [];

      if (clienteId) {
        const id = parseInt(clienteId, 10);
        if (!Number.isNaN(id)) {
          filters.push(sql`c.clienteid = ${id}`);
        }
      }

      if (stato) {
        filters.push(sql`c.stato = ${stato}`);
      }

      let whereClause = sql``;
      if (filters.length > 0) {
        whereClause = sql`WHERE ${filters[0]}`;
        for (let i = 1; i < filters.length; i++) {
          whereClause = sql`${whereClause} AND ${filters[i]}`;
        }
      }

      const result = await sql`
        SELECT 
          c.consegnaid      AS "ConsegnaID",
          c.clienteid       AS "ClienteID",
          cli.nominativo    AS "ClienteNominativo",
          cli.comune        AS "ClienteComune",
          cli.provincia     AS "ClienteProvincia",
          c.dataritiro      AS "DataRitiro",
          c.dataconsegna    AS "DataConsegna",
          c.stato           AS "Stato",
          c.chiaveconsegna  AS "ChiaveConsegna"
        FROM consegna c
        INNER JOIN cliente cli ON c.clienteid = cli.clienteid
        ${whereClause}
        ORDER BY c.consegnaid DESC
      `;

      console.log(`[CONSEGNE] Trovate ${result.length} consegne`);

      return res.json({
        success: true,
        count: result.length,
        data: result,
      });
    } catch (err) {
      console.error("[CONSEGNE] Errore nel recupero lista consegne:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  /**
   * GET /consegne/:id
   * Dettaglio di una singola consegna
   */
  /**
 * @openapi
 * /consegne/{id}:
 *   get:
 *     summary: Dettaglio consegna
 *     tags:
 *       - Consegne
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della consegna
 *     responses:
 *       200:
 *         description: Dettaglio di una consegna
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Consegna'
 *       400:
 *         description: ID non valido
 *       404:
 *         description: Consegna non trovata
 *       500:
 *         description: Errore interno del server
 */
  router.get("/:id", async (req, res) => {
    console.log("[CONSEGNE] Richiesta dettaglio consegna ID:", req.params.id);
    const { id } = req.params;

    const consegnaId = parseInt(id, 10);
    if (Number.isNaN(consegnaId)) {
      return res.status(400).json({ error: "ConsegnaID non valido" });
    }

    try {
      const result = await sql`
        SELECT 
          c.consegnaid      AS "ConsegnaID",
          c.clienteid       AS "ClienteID",
          cli.nominativo    AS "ClienteNominativo",
          cli.via           AS "ClienteVia",
          cli.comune        AS "ClienteComune",
          cli.provincia     AS "ClienteProvincia",
          cli.telefono      AS "ClienteTelefono",
          cli.email         AS "ClienteEmail",
          cli.note          AS "ClienteNote",
          c.dataritiro      AS "DataRitiro",
          c.dataconsegna    AS "DataConsegna",
          c.stato           AS "Stato",
          c.chiaveconsegna  AS "ChiaveConsegna"
        FROM consegna c
        INNER JOIN cliente cli ON c.clienteid = cli.clienteid
        WHERE c.consegnaid = ${consegnaId}
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: "Consegna non trovata" });
      }

      return res.json({
        success: true,
        data: result[0],
      });
    } catch (err) {
      console.error("[CONSEGNE] Errore nel recupero dettaglio:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  /**
   * POST /consegne
   * Crea una nuova consegna.
   * Body:
   * - clienteId (int, obbligatorio)
   * - dataRitiro (string data, opzionale)
   * - dataConsegna (string data, opzionale)
   * - stato (string, obbligatorio, uno di STATI_CONSEGNA)
   * - chiaveConsegna (string, obbligatorio)
   */

  /**
 * @openapi
 * /consegne:
 *   post:
 *     summary: Crea una nuova consegna
 *     tags:
 *       - Consegne
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clienteId
 *               - stato
 *               - chiaveConsegna
 *             properties:
 *               clienteId:
 *                 type: integer
 *               dataRitiro:
 *                 type: string
 *                 format: date-time
 *               dataConsegna:
 *                 type: string
 *                 format: date-time
 *               stato:
 *                 type: string
 *               chiaveConsegna:
 *                 type: string
 *     responses:
 *       201:
 *         description: Consegna creata con successo
 *       400:
 *         description: Dati mancanti o non validi
 *       404:
 *         description: Cliente non trovato
 *       500:
 *         description: Errore interno del server
 */
  router.post("/", async (req, res) => {
    console.log("[CONSEGNE] Creazione nuova consegna");

    const {
      clienteId,
      dataRitiro,
      dataConsegna,
      stato,
      chiaveConsegna,
    } = req.body || {};

    const clienteIdInt = parseInt(clienteId, 10);

    if (!clienteIdInt || Number.isNaN(clienteIdInt)) {
      return res.status(400).json({
        error: "ClienteID è obbligatorio e deve essere un intero",
      });
    }

    if (!stato || !STATI_CONSEGNA.includes(stato)) {
      return res.status(400).json({
        error: `Stato non valido. Valori ammessi: ${STATI_CONSEGNA.join(", ")}`,
      });
    }

    if (!chiaveConsegna) {
      return res.status(400).json({
        error: "ChiaveConsegna è obbligatoria",
      });
    }

    try {
      // Verifica che il cliente esista
      const clienteCheck = await sql`
        SELECT clienteid
        FROM cliente
        WHERE clienteid = ${clienteIdInt}
      `;

      if (clienteCheck.length === 0) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }

      const result = await sql`
        INSERT INTO consegna
          (clienteid, dataritiro, dataconsegna, stato, chiaveconsegna)
        VALUES
          (${clienteIdInt}, ${dataRitiro || null}, ${dataConsegna || null}, ${stato}, ${chiaveConsegna})
        RETURNING
          consegnaid     AS "ConsegnaID",
          clienteid      AS "ClienteID",
          dataritiro     AS "DataRitiro",
          dataconsegna   AS "DataConsegna",
          stato          AS "Stato",
          chiaveconsegna AS "ChiaveConsegna"
      `;

      const nuova = result[0];

      console.log("[CONSEGNE] Consegna creata con ID:", nuova.ConsegnaID);

      return res.status(201).json({
        success: true,
        message: "Consegna creata con successo",
        data: nuova,
      });
    } catch (err) {
      console.error("[CONSEGNE] Errore nella creazione:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  /**
   * PUT /consegne/:id
   * Modifica una consegna esistente.
   * Body come nel POST.
   */
  /**
 * @openapi
 * /consegne/{id}:
 *   put:
 *     summary: Modifica una consegna esistente
 *     tags:
 *       - Consegne
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della consegna da modificare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clienteId
 *               - stato
 *               - chiaveConsegna
 *             properties:
 *               clienteId:
 *                 type: integer
 *               dataRitiro:
 *                 type: string
 *                 format: date-time
 *               dataConsegna:
 *                 type: string
 *                 format: date-time
 *               stato:
 *                 type: string
 *               chiaveConsegna:
 *                 type: string
 *     responses:
 *       200:
 *         description: Consegna aggiornata con successo
 *       400:
 *         description: Dati mancanti o non validi
 *       404:
 *         description: Consegna o cliente non trovati
 *       500:
 *         description: Errore interno del server
 */
  router.put("/:id", async (req, res) => {
    console.log("[CONSEGNE] Modifica consegna ID:", req.params.id);
    const { id } = req.params;

    const consegnaId = parseInt(id, 10);
    if (Number.isNaN(consegnaId)) {
      return res.status(400).json({ error: "ConsegnaID non valido" });
    }

    const {
      clienteId,
      dataRitiro,
      dataConsegna,
      stato,
      chiaveConsegna,
    } = req.body || {};

    const clienteIdInt = parseInt(clienteId, 10);

    if (!clienteIdInt || Number.isNaN(clienteIdInt)) {
      return res.status(400).json({
        error: "ClienteID è obbligatorio e deve essere un intero",
      });
    }

    if (!stato || !STATI_CONSEGNA.includes(stato)) {
      return res.status(400).json({
        error: `Stato non valido. Valori ammessi: ${STATI_CONSEGNA.join(", ")}`,
      });
    }

    if (!chiaveConsegna) {
      return res.status(400).json({
        error: "ChiaveConsegna è obbligatoria",
      });
    }

    try {
      // Verifica che la consegna esista
      const checkConsegna = await sql`
        SELECT consegnaid
        FROM consegna
        WHERE consegnaid = ${consegnaId}
      `;
      if (checkConsegna.length === 0) {
        return res.status(404).json({ error: "Consegna non trovata" });
      }

      // Verifica che il cliente esista
      const clienteCheck = await sql`
        SELECT clienteid
        FROM cliente
        WHERE clienteid = ${clienteIdInt}
      `;
      if (clienteCheck.length === 0) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }

      const result = await sql`
        UPDATE consegna
        SET
          clienteid      = ${clienteIdInt},
          dataritiro     = ${dataRitiro || null},
          dataconsegna   = ${dataConsegna || null},
          stato          = ${stato},
          chiaveconsegna = ${chiaveConsegna}
        WHERE consegnaid = ${consegnaId}
        RETURNING
          consegnaid     AS "ConsegnaID",
          clienteid      AS "ClienteID",
          dataritiro     AS "DataRitiro",
          dataconsegna   AS "DataConsegna",
          stato          AS "Stato",
          chiaveconsegna AS "ChiaveConsegna"
      `;

      console.log("[CONSEGNE] Consegna aggiornata ID:", consegnaId);

      return res.json({
        success: true,
        message: "Consegna aggiornata con successo",
        data: result[0],
      });
    } catch (err) {
      console.error("[CONSEGNE] Errore nella modifica:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  /**
   * DELETE /consegne/:id
   * Cancella una consegna.
   */
  /**
 * @openapi
 * /consegne/{id}:
 *   delete:
 *     summary: Elimina una consegna
 *     tags:
 *       - Consegne
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della consegna da eliminare
 *     responses:
 *       200:
 *         description: Consegna eliminata con successo
 *       400:
 *         description: ID non valido
 *       404:
 *         description: Consegna non trovata
 *       500:
 *         description: Errore interno del server
 */
  router.delete("/:id", async (req, res) => {
    console.log("[CONSEGNE] Eliminazione consegna ID:", req.params.id);
    const { id } = req.params;

    const consegnaId = parseInt(id, 10);
    if (Number.isNaN(consegnaId)) {
      return res.status(400).json({ error: "ConsegnaID non valido" });
    }

    try {
      const result = await sql`
        DELETE FROM consegna
        WHERE consegnaid = ${consegnaId}
        RETURNING consegnaid
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: "Consegna non trovata" });
      }

      console.log("[CONSEGNE] Consegna eliminata ID:", consegnaId);

      return res.json({
        success: true,
        message: "Consegna eliminata con successo",
      });
    } catch (err) {
      console.error("[CONSEGNE] Errore nell'eliminazione:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  return router;
};

module.exports = consegneController;