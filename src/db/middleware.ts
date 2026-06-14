import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose";

/**
 * Express middleware to verify that MongoDB is active and connected
 * before processing any persistent API route.
 * Handles serverless on-demand connection seamlessly.
 */
export async function verifyDatabaseConnection(req: Request, res: Response, next: NextFunction) {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    const state = mongoose.connection.readyState;
    console.error("Database connection guard failed:", err);
    res.status(503).json({
      error: "Database Connection Failed",
      message: "Failed to establish a connection with MongoDB Atlas.",
      details: (err as Error).message,
      connectionState: state
    });
  }
}

/**
 * Standard request logging middleware to track real-time API syncing in the console
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
}
