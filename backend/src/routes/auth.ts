import bcrypt from "bcrypt";
import { Router, type CookieOptions } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { pool } from "../db";

export const authRouter = Router();

const isProd = process.env.NODE_ENV === "production";

/**
 * Generates cookie options for setting the auth token cookie.
 */
function getAuthCookieOptions(expiresIn?: SignOptions["expiresIn"]): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  };

  if (typeof expiresIn === "number") {
    options.maxAge = expiresIn * 1000;
  }

  return options;
}

// POST /auth/register
authRouter.post("/register", async (req, res) => {
  const { email, password, role } = req.body as {
    email?: string;
    password?: string;
    role?: "CUSTOMER" | "DRIVER";
  };

  if (!email || !password || !role) {
    return res.status(400).json({ error: "email, password, role are required" });
  }

  if (role !== "CUSTOMER" && role !== "DRIVER") {
    return res.status(400).json({ error: "role must be CUSTOMER or DRIVER" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email.toLowerCase(), passwordHash, role]
    );

    return res.json(result.rows[0]);
  } catch (e: any) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/login
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const userResult = await pool.query(
    `SELECT id, email, password_hash, role FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  const user = userResult.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: "JWT_SECRET not set" });

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    secret,
    { expiresIn }
  );

  const cookieOptions = getAuthCookieOptions(expiresIn);
  res.cookie("token", token, cookieOptions);
  res.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
});

// POST /auth/logout
authRouter.post("/logout", (req, res) => {
  res.clearCookie("token", getAuthCookieOptions());
  res.json({ ok: true });
});
