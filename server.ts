/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { connectToDatabase, EmployeeModel, PaidRecordModel, SettingsModel } from "./src/db/mongoose";
import { verifyDatabaseConnection, requestLogger } from "./src/db/middleware";

dotenv.config();

const app = express();
const PORT = 3000;

// Connect to MongoDB Atlas (Mongoose)
connectToDatabase().catch((err) => {
  console.error("Critical MongoDB connection failure on backend startup:", err);
});

// Base seed database on startup if MongoDB database is empty
const INITIAL_MOCK_EMPLOYEES = [
  { id: "EMP001", name: "MAHBUB", number: "6", department: "OUR COMPANY", hourlyRate: 120, overtimeRate: 120, dutyHours: 9 },
  { id: "EMP002", name: "SARAH KHAN", number: "12", department: "OUR COMPANY", hourlyRate: 150, overtimeRate: 150, dutyHours: 9 },
  { id: "EMP003", name: "JOHN DOE", number: "25", department: "LOGISTICS", hourlyRate: 110, overtimeRate: 110, dutyHours: 9 },
  { id: "EMP004", name: "ALEX GRADY", number: "33", department: "ADMINISTRATION", hourlyRate: 160, overtimeRate: 160, dutyHours: 9 },
  { id: "EMP005", name: "TAREK AZIZ", number: "8", department: "OUR COMPANY", hourlyRate: 130, overtimeRate: 130, dutyHours: 9 }
];

async function seedDatabase() {
  try {
    const count = await EmployeeModel.countDocuments();
    if (count === 0) {
      await EmployeeModel.insertMany(INITIAL_MOCK_EMPLOYEES);
      console.log("Database seeded successfully with initial employees");
    }
  } catch (err) {
    console.error("Error seeding default employees:", err);
  }
}
seedDatabase();

// Use Express Global Middleware
app.use(express.json());
app.use(requestLogger);

// Apply Database Connection Guard Middleware on API routes
app.use("/api", verifyDatabaseConnection);

// API Endpoints (MongoDB Synced Routes)

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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started. Listening on http://0.0.0.0:${PORT}`);
  });
}

startViteServer();
