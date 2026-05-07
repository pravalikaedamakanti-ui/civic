const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "civic-watch",
  password: "Ranga@1012",
  port: 5432,
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL DB"))
  .catch(err => console.error("❌ DB connection error:", err));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend"))); 

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, "../frontend/uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// POST route for issues

app.post("/issues", upload.single("image"), async (req, res) => {
  console.log("=== NEW REQUEST ===");
  console.log("req.body:", req.body);
  console.log("req.file:", req.file);

  const { name, phone, address, description, type } = req.body;
  const imagePath = req.file ? `uploads/${req.file.filename}` : null;

  if (!address || !description || !type) {
    console.log("Missing required fields!");
    return res.status(400).json({ success: false, error: "Address, Description and Type are required." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO issues(name, phone, address, description, type, image) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [name || null, phone || null, address, description, type, imagePath]
    );

    console.log("Inserted issue:", result.rows[0]);
    res.status(201).json({ success: true, issue: result.rows[0] });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all issues
app.get("/issues", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM issues ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("DB Fetch Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
