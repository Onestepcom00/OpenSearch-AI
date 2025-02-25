const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = 3000;

// Liste de User-Agents pour éviter d'être détecté comme bot
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36"
];

// Fonction pour récupérer un User-Agent aléatoire
const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

/**
 * Route principale de scraping
 * Exemple : http://localhost:3000/scrape?url=https://example.com&proxy=false&ct=true
 */
app.get("/scrape", async (req, res) => {
    try {
        let { url, proxy, ct } = req.query;
        if (!url) return res.status(400).json({ error: "Paramètre 'url' requis." });

        // Options de la requête HTTP
        let options = {
            headers: { "User-Agent": getRandomUserAgent() }
        };

        // Ajouter un proxy si activé
        if (proxy === "true") {
            options.proxy = {
                host: "PROXY_HOST",
                port: "PROXY_PORT",
                auth: { username: "PROXY_USER", password: "PROXY_PASS" }
            };
        }

        // Récupération du HTML
        const response = await axios.get(url, options);
        const $ = cheerio.load(response.data);
        const baseUrl = new URL(url).origin;

        let textContent = [];
        let imageLinks = [];
        let pageLinks = [];

        // Récupération du texte (sans balises script, style)
        $("body *:not(script):not(style)").each(function () {
            let text = $(this).text().trim();
            if (text && text.length > 2) textContent.push(text);
        });

        // Récupération des liens images (ajout du domaine si nécessaire)
        $("img").each(function () {
            let imgSrc = $(this).attr("src");
            if (imgSrc) {
                if (!imgSrc.startsWith("http")) imgSrc = baseUrl + imgSrc;
                imageLinks.push(imgSrc);
            }
        });

        // Récupération des liens de la page
        $("a").each(function () {
            let link = $(this).attr("href");
            if (link) {
                if (!link.startsWith("http")) link = baseUrl + link;
                pageLinks.push(link);
            }
        });

        // Vérification CAPTCHA (si demandé)
        let hasCaptcha = false;
        if (ct === "true") {
            if ($("input[name='g-recaptcha-response']").length || $("iframe[src*='captcha']").length) {
                hasCaptcha = true;
            }
        }

        return res.json({
            url,
            captcha_detected: hasCaptcha,
            text: textContent.slice(0, 50), // Limite à 50 textes max pour éviter les réponses trop longues
            images: imageLinks.slice(0, 50),
            links: pageLinks.slice(0, 50)
        });

    } catch (error) {
        return res.status(500).json({ error: "Erreur lors du scraping", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
