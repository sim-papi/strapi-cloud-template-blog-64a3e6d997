import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Strapi Proxy Route
  app.all("/api/*", async (req, res) => {
    const endpoint = req.params[0];
    const STRAPI_URL = process.env.STRAPI_URL || "https://intuitive-memory-dc65a51bfe.strapiapp.com";
    const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

    if (!STRAPI_TOKEN) {
      return res.status(500).json({ error: "STRAPI_TOKEN not configured on server" });
    }

    try {
      // Normalize STRAPI_URL and remove trailing slash
      const baseStrapiUrl = STRAPI_URL.replace(/\/$/, "");
      
      // Clean up the endpoint from the request
      const cleanEndpoint = endpoint.replace(/^api\//, "");
      
      // Get query string from original request
      const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      
      // Construct the final URL
      let url;
      if (baseStrapiUrl.endsWith("/api")) {
        url = `${baseStrapiUrl}/${cleanEndpoint}${queryString}`;
      } else {
        url = `${baseStrapiUrl}/api/${cleanEndpoint}${queryString}`;
      }
      
      console.log(`[PROXY] Requesting Strapi URL (${req.method}): ${url}`);
      
      const fetchOptions: any = {
        method: req.method,
        headers: {
          Authorization: `Bearer ${STRAPI_TOKEN}`,
          "Content-Type": "application/json",
        },
      };

      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        fetchOptions.body = JSON.stringify(req.body);
      }
      
      const response = await fetch(url, fetchOptions);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log(`[PROXY] Received JSON from Strapi (Status ${response.status})`);
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        console.log(`[PROXY] Received non-JSON response from Strapi (Status ${response.status}):`, text.substring(0, 200));
        res.status(response.status).send(text);
      }
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from Strapi", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
