//=================================================
// File: trackingController.js
// Endpoint pubblico per il tracking delle consegne
//=================================================

const express = require("express");
const router = express.Router();

const trackingController = (sql) => {
  /**
   * GET /tracking
   * Parametri query:
   * - chiaveConsegna (string, obbligatorio)
   * - dataRitiro (YYYY-MM-DD, obbligatorio)
   *
   * Restituisce stato, data ritiro e consegna (se presente).
   */
  router.get("/", async (req, res) => {
    const { chiaveConsegna, dataRitiro } = req.query;

    if (!chiaveConsegna || !dataRitiro) {
      return res.status(400).json({
        error: "chiaveConsegna e dataRitiro sono obbligatori",
      });
    }

    try {
      const result = await sql`
        SELECT 
          c.consegnaid      AS "ConsegnaID",
          c.chiaveconsegna  AS "ChiaveConsegna",
          c.dataritiro      AS "DataRitiro",
          c.dataconsegna    AS "DataConsegna",
          c.stato           AS "Stato",
          cli.nominativo    AS "ClienteNominativo"
        FROM consegna c
        INNER JOIN cliente cli ON c.clienteid = cli.clienteid
        WHERE c.chiaveconsegna = ${chiaveConsegna}
          AND c.dataritiro = ${dataRitiro}
      `;

      if (result.length === 0) {
        return res.status(404).json({
          error: "Nessuna consegna trovata per i dati forniti",
        });
      }

      const consegna = result[0];

      return res.json({
        success: true,
        data: {
          chiaveConsegna: consegna.ChiaveConsegna,
          stato: consegna.Stato,
          dataRitiro: consegna.DataRitiro,
          dataConsegna: consegna.DataConsegna,
          cliente: consegna.ClienteNominativo,
        },
      });
    } catch (err) {
      console.error("[TRACKING] Errore nella ricerca tracking:", err);
      return res.status(500).json({
        error: "Errore interno del server",
        details: err.message,
      });
    }
  });

  return router;
};

module.exports = trackingController;

