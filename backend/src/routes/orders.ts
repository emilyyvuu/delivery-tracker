import { Router } from "express";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

type AuthUser = {
  userId: string;
  role: "CUSTOMER" | "DRIVER";
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export const ordersRouter = Router();

// POST /orders (customer only)
ordersRouter.post("/", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body ?? {};

  const coords = [pickupLat, pickupLng, dropoffLat, dropoffLng];
  if (!coords.every(isFiniteNumber)) {
    return res.status(400).json({ error: "Invalid pickup/dropoff coords" });
  }

  const user = (req as any).user as AuthUser;

  try {
    const driverResult = await pool.query( // TODO: change driver assignment logic
      "SELECT id FROM users WHERE role = 'DRIVER' ORDER BY created_at ASC LIMIT 1"
    );
    const driverId = driverResult.rows[0]?.id ?? null;
    const status = driverId ? "ASSIGNED" : "CREATED";

    const result = await pool.query(
      `INSERT INTO orders
        (customer_id, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user.userId, driverId, pickupLat, pickupLng, dropoffLat, dropoffLng, status]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /orders/:id (customer or assigned driver)
ordersRouter.get("/:id", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const orderId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM orders
       WHERE id = $1 AND (
         (customer_id = $2 AND $3 = 'CUSTOMER') OR
         (driver_id = $2 AND $3 = 'DRIVER')
       )`,
      [orderId, user.userId, user.role]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});
