import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

/**
 * Express middleware to verify that MongoDB is active and connected
 * before processing any persistent API route.
 */
export function verifyDatabaseConnection(req: Request, res: Response, next: NextFunction) {
  const state = mongoose.connection.readyState;
  
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  if (state !== 1 && state !== 2) {
    return res.status(503).json({
      error: "Database Service Unavailable",
      message: "MongoDB Atlas connection is currently offline or reconnecting. Please check connection string.",
      connectionState: state
    });
  }
  
  next();
}

/**
 * Standard request logging middleware to track real-time API syncing in the console
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
}
