require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.5-flash"; // model dengan kuota gratis paling longgar

const KB_PATH = path.join(__dirname, "data", "kb.json");
const STATS_PATH = path.join(__dirname, "data", "stats.json");
const ESC_PATH = path.join(__dirname, "data", "escalations.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Helpers baca/tulis file JSON sebagai "database" sederhana ----------
function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return fallback;
  }
}
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ---------- Knowledge base ----------
app.get("/api/kb", (req, res) => {
  res.json(readJSON(KB_PATH, []));
});

app.post("/api/kb", (req, res) => {
  const { key, answer } = req.body;
  if (!key || !answer) {
    return res.status(400).json({ error: "key dan answer wajib diisi" });
  }
  const kb = readJSON(KB_PATH, []);
  kb.push({ key: key.toLowerCase().trim(), answer: answer.trim(), hits: 0 });
  writeJSON(KB_PATH, kb);
  res.json({ ok: true, kb });
});

app.delete("/api/kb/:index", (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const kb = readJSON(KB_PATH, []);
  if (Number.isNaN(idx) || idx < 0 || idx >= kb.length) {
    return res.status(404).json({ error: "entri tidak ditemukan" });
  }
  kb.splice(idx, 1);
  writeJSON(KB_PATH, kb);
  res.json({ ok: true, kb });
});

// ---------- Status AI (dipakai indikator di sidebar) ----------
app.get("/api/status", (req, res) => {
  res.json({ aiEnabled: Boolean(GEMINI_API_KEY) });
});

// ---------- Statistik ----------
app.get("/api/stats", (req, res) => {
  res.json(readJSON(STATS_PATH, { total: 0, kbMatched: 0, aiAnswered: 0, escalated: 0 }));
});

// ---------- Daftar eskalasi ----------
app.get("/api/escalations", (req, res) => {
  res.json(readJSON(ESC_PATH, []));
});

// ---------- Panggil Gemini API sebagai fallback AI (gratis, dari Google AI Studio) ----------
async function askGemini(question) {
  if (!GEMINI_API_KEY) return null;

  const systemPrompt =
    "Kamu adalah BizChat, asisten layanan pelanggan untuk sebuah usaha kecil-menengah (UMKM). " +
    "Jawab HANYA pertanyaan seputar produk, harga, jam operasional, pemesanan, atau pengiriman " +
    "secara singkat (maksimal 3 kalimat) dan ramah dalam Bahasa Indonesia. " +
    "Jika pertanyaan di luar topik tersebut, atau kamu tidak yakin jawabannya, " +
    "balas persis dengan teks: ESCALATE";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    });

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

    if (!answer || answer.includes("ESCALATE")) return null;
    return answer;
  } catch (err) {
    console.error("Gagal memanggil Gemini API:", err.message);
    return null;
  }
}

// ---------- Endpoint utama chat ----------
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "message wajib diisi" });
  }

  const stats = readJSON(STATS_PATH, { total: 0, kbMatched: 0, aiAnswered: 0, escalated: 0 });
  stats.total += 1;

  // 1) Coba cocokkan ke knowledge base dulu (cepat & gratis)
  const kb = readJSON(KB_PATH, []);
  const lower = message.toLowerCase();
  const kbIndex = kb.findIndex((item) => lower.includes(item.key));
  if (kbIndex !== -1) {
    kb[kbIndex].hits = (kb[kbIndex].hits || 0) + 1;
    writeJSON(KB_PATH, kb);
    stats.kbMatched += 1;
    writeJSON(STATS_PATH, stats);
    return res.json({ source: "kb", answer: kb[kbIndex].answer });
  }

  // 2) Kalau tidak ada di knowledge base, coba tanya AI (kalau API key tersedia)
  const aiAnswer = await askGemini(message);
  if (aiAnswer) {
    stats.aiAnswered += 1;
    writeJSON(STATS_PATH, stats);
    return res.json({ source: "ai", answer: aiAnswer });
  }

  // 3) Kalau AI tidak tersedia/tidak yakin, eskalasi ke staf
  stats.escalated += 1;
  writeJSON(STATS_PATH, stats);
  const escalations = readJSON(ESC_PATH, []);
  escalations.push({ question: message, time: new Date().toISOString() });
  writeJSON(ESC_PATH, escalations);

  return res.json({
    source: "escalate",
    answer:
      "Aku belum punya jawaban untuk itu. Pertanyaanmu sudah diteruskan ke tim kami dan akan segera dibalas.",
  });
});

app.listen(PORT, () => {
  console.log(`BizChat jalan di http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.log("Catatan: GEMINI_API_KEY belum diisi di .env — fallback AI nonaktif, pertanyaan di luar knowledge base akan langsung dieskalasi.");
  }
});
