import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  userId: string;
  role: "CUSTOMER" | "DRIVER";
};

/**
 * Helper to extract a specific cookie value from the Cookie header.
 */
function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [key, ...valueParts] = part.split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return undefined;
}

/**
 * Checks if the request has a valid JWT token. If valid, attaches the user info to the request.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token =
    authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : getCookieValue(req.headers.cookie, "token");

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid auth token" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not set");

    const payload = jwt.verify(token, secret) as JwtPayload;

    // attach user info to req for later handlers
    (req as any).user = payload;

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Checks that the authenticated user has a specific role.
 */
export function requireRole(role: "CUSTOMER" | "DRIVER") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    if (user.role !== role) {
      return res.status(403).json({ error: "Forbidden (wrong role)" });
    }

    next();
  };
}
