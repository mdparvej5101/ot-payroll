/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import { connectToDatabase, EmployeeModel, PaidRecordModel, SettingsModel, UserModel } from "./src/db/mongoose";
import { verifyDatabaseConnection, requestLogger } from "./src/db/middleware";

dotenv.config();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const app = express();
const PORT = 3000;

// Connect to MongoDB Atlas (Mongoose) sequentially on startup
connectToDatabase().catch((err) => {
  console.error("Critical MongoDB connection failure on backend startup:", err);
});

// Use Express Global Middleware
app.use(express.json());
app.use(requestLogger);

// Apply Database Connection Guard Middleware on API routes
app.use("/api", verifyDatabaseConnection);

// API Endpoints (MongoDB Synced Routes)

// 0. Authentication Endpoints
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const hashed = hashPassword(password);
    if (user.password !== hashed) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    res.json({ success: true, email: user.email });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  return res.status(403).json({
    error: "Registration is disabled. Only the system administrator can create user credentials."
  });
});

// User Management APIs for Admin
app.get("/api/users", async (req, res) => {
  try {
    const list = await UserModel.find({}, { email: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const hashed = hashPassword(password);
    const newUser = await UserModel.create({
      email: normalizedEmail,
      password: hashed
    });
    res.json({ success: true, email: newUser.email });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/users/:email", async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const targetEmail = email.toLowerCase().trim();
    if (targetEmail === "rangdhanuit@gmail.com") {
      return res.status(400).json({ error: "Cannot delete the master administrator account!" });
    }
    const deleted = await UserModel.deleteOne({ email: targetEmail });
    res.json({ success: true, deletedCount: deleted.deletedCount });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 1. Employee Management APIs
app.get("/api/employees", async (req, res) => {
  try {
    const list = await EmployeeModel.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/employees", async (req, res) => {
  try {
    const employees = req.body;
    if (!Array.isArray(employees)) {
      return res.status(400).json({ error: "Expected an array of employees" });
    }
    await EmployeeModel.deleteMany({});
    const inserted = await EmployeeModel.insertMany(employees);
    res.json({ success: true, count: inserted.length, employees: inserted });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 2. Payments History APIs
app.get("/api/payments", async (req, res) => {
  try {
    const list = await PaidRecordModel.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const record = req.body;
    const existing = await PaidRecordModel.findOne({ 
      employeeId: record.employeeId, 
      monthStr: record.monthStr 
    });

    if (existing) {
      Object.assign(existing, record);
      await existing.save();
      res.json(existing);
    } else {
      const newRecord = new PaidRecordModel(record);
      await newRecord.save();
      res.json(newRecord);
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/payments/:id", async (req, res) => {
  try {
    await PaidRecordModel.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/payments", async (req, res) => {
  try {
    await PaidRecordModel.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 3. Persistent App Settings APIs (for deductions & configs)
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await SettingsModel.find({});
    const result: Record<string, any> = {};
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { key, value } = req.body;
    await SettingsModel.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Front-end Vite integration
async function startViteServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.log("Running in development mode...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to start Vite dev server, compiling fallback...", err);
    }
  } else {
    console.log("Running in production mode, serving dist static files...");
    const distPath = typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server started. Listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startViteServer();

export default app;
