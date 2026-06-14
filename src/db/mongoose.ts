import mongoose from "mongoose";
import crypto from "crypto";

// Connection URI
const mongoUri = process.env.MONGODB_URI || "mongodb+srv://overtime_payroll:45374513@cluster0.bc2oql2.mongodb.net/?appName=Cluster0";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// 1. Employee Schema
export const EmployeeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  number: { type: String, required: true },
  department: { type: String, required: true },
  hourlyRate: { type: Number, required: true },
  overtimeRate: { type: Number, required: true },
  dutyHours: { type: Number, required: true }
});

export const EmployeeModel = (mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema)) as any;

// 2. Paid Record Schema
export const PaidRecordSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  monthStr: { type: String, required: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  employeeNum: { type: String, required: true },
  department: { type: String, required: true },
  totalDaysWorked: { type: Number, required: true },
  offDaysCount: { type: Number, required: true },
  cumulativeHours: { type: Number, required: true },
  cumulativeOvertimeHours: { type: Number, required: true },
  regularPay: { type: Number, required: true },
  overtimePay: { type: Number, required: true },
  totalGrossPay: { type: Number, required: true },
  paymentDateStr: { type: String, required: true }
});

export const PaidRecordModel = (mongoose.models.PaidRecord || mongoose.model("PaidRecord", PaidRecordSchema)) as any;

// 3. Settings Schema
export const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

export const SettingsModel = (mongoose.models.Settings || mongoose.model("Settings", SettingsSchema)) as any;

// 4. User Schema (Simple Credentials Authentication)
export const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

export const UserModel = (mongoose.models.User || mongoose.model("User", UserSchema)) as any;


// Base seed database on startup if MongoDB database is empty
const INITIAL_MOCK_EMPLOYEES = [
  { id: "EMP001", name: "MAHBUB", number: "6", department: "OUR COMPANY", hourlyRate: 120, overtimeRate: 120, dutyHours: 9 },
  { id: "EMP002", name: "SARAH KHAN", number: "12", department: "OUR COMPANY", hourlyRate: 150, overtimeRate: 150, dutyHours: 9 },
  { id: "EMP003", name: "JOHN DOE", number: "25", department: "LOGISTICS", hourlyRate: 110, overtimeRate: 110, dutyHours: 9 },
  { id: "EMP004", name: "ALEX GRADY", number: "33", department: "ADMINISTRATION", hourlyRate: 160, overtimeRate: 160, dutyHours: 9 },
  { id: "EMP005", name: "TAREK AZIZ", number: "8", department: "OUR COMPANY", hourlyRate: 130, overtimeRate: 130, dutyHours: 9 }
];

let isSeedingCompleted = false;

export async function seedDatabase() {
  if (isSeedingCompleted) return;
  try {
    const count = await EmployeeModel.countDocuments();
    if (count === 0) {
      await EmployeeModel.insertMany(INITIAL_MOCK_EMPLOYEES);
      console.log("Database seeded successfully with initial employees");
    }

    const adminEmail = "rangdhanuit@gmail.com";
    const existingAdmin = await UserModel.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const defaultUser = {
        email: adminEmail,
        password: hashPassword("rangdhanu")
      };
      await UserModel.create(defaultUser);
      console.log(`Database seeded successfully with master administrator (email: ${adminEmail})`);
    } else {
      existingAdmin.password = hashPassword("rangdhanu");
      await existingAdmin.save();
      console.log(`Master administrator password verified for ${adminEmail}`);
    }
    isSeedingCompleted = true;
  } catch (err) {
    console.error("Error seeding default databases inside connectToDatabase:", err);
  }
}

// Connect function
export async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) {
    await seedDatabase();
    return;
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully via Mongoose");
    await seedDatabase();
  } catch (err) {
    console.error("MongoDB Mongoose connection error:", err);
    throw err;
  }
}
