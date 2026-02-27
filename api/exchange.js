export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { authCode, redirectUri } = req.body || {};
    if (!authCode) return res.status(400).json({ error: "Missing authCode" });

    const clientId = process.env.ICE_CLIENT_ID;
    const clientSecret = process.env.ICE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Missing ICE_CLIENT_ID / ICE_CLIENT_SECRET env vars" });
    }

    // ICE token endpoint (authorization_code exchange)
    const tokenUrl = "https://api.elliemae.com/oauth2/v1/token";

    // Some ICE app registrations require redirect_uri for the code exchange.
    // We accept it optionally from the client; you can hardcode if your org requires it.
    const form = new URLSearchParams();
    form.set("grant_type", "authorization_code");
    form.set("code", authCode);
    if (redirectUri) form.set("redirect_uri", redirectUri);

    // Per ICE docs: client_id/client_secret are typically sent via Basic auth header (-u client:secret).
    // We'll do that here.
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ error: "Token exchange failed", details: text });
    }

    // token payload is JSON
    res.status(200).setHeader("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}