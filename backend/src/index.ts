import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { requireAuth } from "./middleware/auth";

dotenv.config();

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use("/auth", authRouter);

// Protected route to get current user info
app.get("/me", requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({ user });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running!" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Backend listening on http://localhost:${PORT}`);
});