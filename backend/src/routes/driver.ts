import { Router } from "express";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

type AuthUser = {
  userId: string;
  role: "CUSTOMER" | "DRIVER";
};

export const driverRouter = Router();

// GET /driver/orders (driver only)
driverRouter.get("/orders", requireAuth, requireRole("DRIVER"), async (req, res) => {
  const user = (req as any).user as AuthUser;

  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE driver_id = $1 ORDER BY created_at DESC",
      [user.userId]
    );

    return res.json({ orders: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});
