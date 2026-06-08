import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

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

  // 4. API Route: Pathao Connection Test / Token Request
  app.post("/api/pathao/check-connection", async (req, res) => {
    try {
      const { clientId, clientSecret, username, password, storeId } = req.body;

      if (!clientId || !clientSecret || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "Pathao Client ID, Client Secret, Username (Email) and Password are required."
        });
      }

      // Request token from Pathao OAuth
      const tokenResponse = await fetch("https://openapi.pathao.com/aladdin/api/v1/issue-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          client_id: String(clientId).trim(),
          client_secret: String(clientSecret).trim(),
          username: String(username).trim(),
          password: String(password).trim(),
          grant_type: "password"
        })
      });

      const responseText = await tokenResponse.text();
      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
      } catch (e) {
        tokenData = { status: tokenResponse.status, message: responseText };
      }

      if (tokenResponse.ok && tokenData.access_token) {
        return res.json({
          success: true,
          message: "পাঠাও এপিআই এর সাথে কানেক্ট হয়েছে!",
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in,
          raw: tokenData
        });
      } else {
        // Fallback for sandboxed developer test accounts if needed, or clear error code reporting
        return res.status(tokenResponse.status).json({
          success: false,
          message: tokenData.message || tokenData.error_description || "Invalid client credentials, store ID or username/password.",
          raw: tokenData
        });
      }
    } catch (err: any) {
      console.error("Error testing Pathao Connection Proxy:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to establish a network connection to Pathao."
      });
    }
  });

  // 5. API Route: Pathao Courier Order Creation
  app.post("/api/pathao/create-order", async (req, res) => {
    try {
      const { 
        clientId, 
        clientSecret, 
        username, 
        password, 
        storeId,
        recipient_name, 
        recipient_phone, 
        recipient_address, 
        cod_amount, 
        note, 
        weight,
        invoice,
        recipient_city,
        recipient_zone,
        recipient_area
      } = req.body;

      if (!clientId || !clientSecret || !username || !password || !storeId) {
        return res.status(400).json({
          success: false,
          message: "Required Pathao merchant integration keys or Store ID are missing."
        });
      }

      // First step: Issue token
      const tokenResponse = await fetch("https://openapi.pathao.com/aladdin/api/v1/issue-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          client_id: String(clientId).trim(),
          client_secret: String(clientSecret).trim(),
          username: String(username).trim(),
          password: String(password).trim(),
          grant_type: "password"
        })
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        return res.status(tokenResponse.status).json({
          success: false,
          message: "Pathao authentication token generation failed: " + errText
        });
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Make create order call
      const orderPayload = {
        store_id: Number(storeId),
        merchant_order_id: String(invoice || ''),
        sender_name: "Sera Fashion House",
        sender_phone: "01800000000", // Default sender phone placeholder
        recipient_name: String(recipient_name),
        recipient_phone: String(recipient_phone),
        recipient_address: String(recipient_address),
        recipient_city: Number(recipient_city || 1), // Dhaka City default
        recipient_zone: Number(recipient_zone || 1), // Dhaka Zone default
        recipient_area: recipient_area ? Number(recipient_area) : null,
        delivery_type: "48", // Normal DELIVERY
        item_type: "2", // Parcel / Clothing Group
        special_instruction: String(note || ''),
        item_quantity: 1,
        amount: Number(cod_amount),
        item_weight: Number(weight || 0.5)
      };

      const pathaoOrderResponse = await fetch("https://openapi.pathao.com/aladdin/api/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(orderPayload)
      });

      const responseText = await pathaoOrderResponse.text();
      let orderResponseData;
      try {
        orderResponseData = JSON.parse(responseText);
      } catch (e) {
        orderResponseData = { status: pathaoOrderResponse.status, message: responseText };
      }

      if (pathaoOrderResponse.ok && (orderResponseData.code === 200 || orderResponseData.type === 'success' || orderResponseData.data)) {
        return res.json({
          success: true,
          data: orderResponseData
        });
      } else {
        return res.status(pathaoOrderResponse.status).json({
          success: false,
          message: orderResponseData.message || (orderResponseData.errors ? JSON.stringify(orderResponseData.errors) : "Pathao automated booking rejected this payload."),
          raw: orderResponseData
        });
      }
    } catch (err: any) {
      console.error("Error creating Pathao consignment order:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to make call to Pathao Courier Services."
      });
    }
  });

  // 6. Vite integration of public routing asset pipeline
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
  app.listen(PORT, () => {
    console.log(`Server successfully bounded to port ${PORT}`);
  });
}

startServer();
