import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 2. API Route: SteadFast Connection Test / Balance Check
  app.post("/api/steadfast/check-balance", async (req, res) => {
    try {
      const apiKey = req.headers['x-steadfast-api-key'] || req.body.apiKey;
      const secretKey = req.headers['x-steadfast-secret-key'] || req.body.secretKey;

      if (!apiKey || !secretKey) {
        return res.status(400).json({
          success: false,
          message: "SteadFast API Key and Secret Key are required."
        });
      }

      const response = await fetch("https://portal.steadfast.com.bd/api/v1/get_balance", {
        method: "GET",
        headers: {
          "Api-Key": String(apiKey).trim(),
          "Secret-Key": String(secretKey).trim(),
          "Content-Type": "application/json"
        }
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { status: response.status, message: responseText };
      }

      if (response.ok && (responseData.status === 200 || responseData.status === '200' || responseData.current_balance !== undefined)) {
        return res.json({
          success: true,
          balance: responseData.current_balance !== undefined ? responseData.current_balance : 0,
          raw: responseData
        });
      } else {
        return res.status(response.status).json({
          success: false,
          message: responseData.message || "Invalid API credentials or connection error.",
          raw: responseData
        });
      }
    } catch (err: any) {
      console.error("Error in SteadFast Balanace Check Proxy API:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to connect to Steadfast Courier."
      });
    }
  });

  // 3. API Route: SteadFast Create Order / Consignment Booking
  app.post("/api/steadfast/create-order", async (req, res) => {
    try {
      const apiKey = req.headers['x-steadfast-api-key'] || req.body.apiKey;
      const secretKey = req.headers['x-steadfast-secret-key'] || req.body.secretKey;

      if (!apiKey || !secretKey) {
        return res.status(400).json({
          success: false,
          message: "SteadFast API Key and Secret Key are required."
        });
      }

      const { invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note, weight } = req.body;

      if (!recipient_name || !recipient_phone || !recipient_address || cod_amount === undefined) {
        return res.status(400).json({
          success: false,
          message: "Required recipient fields are missing."
        });
      }

      const payload = {
        invoice: String(invoice || ''),
        recipient_name: String(recipient_name),
        recipient_phone: String(recipient_phone),
        recipient_address: String(recipient_address),
        cod_amount: Number(cod_amount),
        note: String(note || ''),
        weight: Number(weight || 0.5)
      };

      const response = await fetch("https://portal.steadfast.com.bd/api/v1/create_order", {
        method: "POST",
        headers: {
          "Api-Key": String(apiKey).trim(),
          "Secret-Key": String(secretKey).trim(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { status: response.status, message: responseText };
      }

      if (response.ok && (responseData.status === 200 || responseData.status === '200')) {
        return res.json({
          success: true,
          data: responseData
        });
      } else {
        return res.status(response.status).json({
          success: false,
          message: responseData.message || (responseData.errors ? JSON.stringify(responseData.errors) : "Failed to book consignment on Steadfast."),
          raw: responseData
        });
      }
    } catch (err: any) {
      console.error("Error in Steadfast order creation:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to make call to Steadfast Courier."
      });
    }
  });

  // 4. Vite integration of public routing asset pipeline
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html as wildcard static wrapper fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server listener
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully bounded to 0.0.0.0:${PORT}`);
  });
}

startServer();
