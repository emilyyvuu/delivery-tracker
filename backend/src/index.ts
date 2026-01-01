import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check route
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running!" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Backend listening on http://localhost:${PORT}`);
});