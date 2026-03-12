//=================================================
// File: clienteController.js
// Gestione CRUD dei clienti del corriere
// @author: andrea.villari@allievi.itsdigitalacademy.com
// @version: 1.0.0 2026-01-14
// =================================================

const express = require("express");
const router = express.Router();

const clienteController = (sql) => {

    // GET /clienti - lista completa clienti
    router.get("/", async (req, res) => {
        console.log("[CLIENTE] Richiesta lista clienti");

        try {
            const result = await sql`
                SELECT 
                    "ClienteID",
                    "Nominativo",
                    "Via",
                    "Comune",
                    "Provincia",
                    "Telefono",
                    "Email",
                    "Note"
                FROM "Cliente"
                ORDER BY "Nominativo" ASC
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
    router.get("/:id", async (req, res) => {
        console.log("[CLIENTE] Richiesto cliente ID:", req.params.id);
        const { id } = req.params;

        try {
            const result = await sql`
                SELECT 
                    "ClienteID",
                    "Nominativo",
                    "Via",
                    "Comune",
                    "Provincia",
                    "Telefono",
                    "Email",
                    "Note"
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
                SELECT "ClienteID" FROM "Cliente" 
                WHERE LOWER("Nominativo") = LOWER(${nominativo})
            `;

            if (checkExisting.length > 0) {
                return res.status(409).json({
                    error: "Esiste già una cliente con questo ID o nominativo"
                });
            }

            // Inserisci il nuovo cliente (ClienteID è SERIAL)
            const result = await sql`
                INSERT INTO "Cliente" 
                    ("Nominativo", "Via", "Comune", "Provincia", "Telefono", "Email", "Note")
                VALUES 
                    (${nominativo}, ${via}, ${comune}, ${provincia}, ${telefono}, ${email}, ${note})
                RETURNING 
                    "ClienteID",
                    "Nominativo",
                    "Via",
                    "Comune",
                    "Provincia",
                    "Telefono",
                    "Email",
                    "Note"
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
                SELECT "ClienteID" FROM "Cliente" 
                WHERE "ClienteID" = ${id}
            `;

            if (checkExists.length === 0) {
                return res.status(404).json({
                    error: "Cliente non trovato"
                });
            }

            // Verifica se esiste già un altro cliente con lo stesso nominativo
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
                SET 
                    "Nominativo" = ${nominativo},
                    "Via"        = ${via},
                    "Comune"     = ${comune},
                    "Provincia"  = ${provincia},
                    "Telefono"   = ${telefono},
                    "Email"      = ${email},
                    "Note"       = ${note}
                WHERE "ClienteID" = ${id}
                RETURNING 
                    "ClienteID",
                    "Nominativo",
                    "Via",
                    "Comune",
                    "Provincia",
                    "Telefono",
                    "Email",
                    "Note"
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