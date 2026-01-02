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

/**
 * Helper to transition order status with validation
 */
async function transitionOrderStatus(
  orderId: string,
  driverId: string,
  expectedStatus: "ASSIGNED" | "IN_PROGRESS",
  nextStatus: "IN_PROGRESS" | "COMPLETED"
) {
  const orderResult = await pool.query(
    "SELECT id, driver_id, status FROM orders WHERE id = $1",
    [orderId]
  );

  const order = orderResult.rows[0];
  if (!order) {
    return { status: 404 as const, error: "Order not found" };
  }

  if (order.driver_id !== driverId) {
    return { status: 403 as const, error: "Forbidden (not assigned)" };
  }

  if (order.status !== expectedStatus) {
    const action = nextStatus === "IN_PROGRESS" ? "start" : "complete";
    return {
      status: 400 as const,
      error: `Order must be ${expectedStatus} to ${action}`,
    };
  }

  const updated = await pool.query(
    "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
    [nextStatus, orderId]
  );

  return { status: 200 as const, order: updated.rows[0] };
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

// POST /orders/:id/start (driver only)
ordersRouter.post("/:id/start", requireAuth, requireRole("DRIVER"), async (req, res) => {
  const user = (req as any).user as AuthUser;
  const orderId = req.params.id;

  try {
    const result = await transitionOrderStatus(
      orderId,
      user.userId,
      "ASSIGNED",
      "IN_PROGRESS"
    );

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json(result.order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /orders/:id/complete (driver only)
ordersRouter.post(
  "/:id/complete",
  requireAuth,
  requireRole("DRIVER"),
  async (req, res) => {
    const user = (req as any).user as AuthUser;
    const orderId = req.params.id;

    try {
      const result = await transitionOrderStatus(
        orderId,
        user.userId,
        "IN_PROGRESS",
        "COMPLETED"
      );

      if (result.status !== 200) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.json(result.order);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Server error" });
    }
  }
);
