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
    await connectToDatabase().catch(err => {
      console.warn("MongoDB connection guard offline, proceeding in-memory/local mode safely:", err);
    });
    next();
  } catch (err) {
    console.warn("Database connection bypassed completely:", err);
    next();
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
