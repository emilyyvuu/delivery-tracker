import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { authRouter } from "./routes/auth";
import { ordersRouter } from "./routes/orders";
import { driverRouter } from "./routes/driver";
import { requireAuth } from "./middleware/auth";
import { initSocket } from "./socket";

dotenv.config();

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use("/auth", authRouter);
app.use("/orders", ordersRouter);
app.use("/driver", driverRouter);

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
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});