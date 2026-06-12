import mongoose from "mongoose";

// Connection URI
const mongoUri = process.env.MONGODB_URI || "mongodb+srv://overtime_payroll:45374513@cluster0.bc2oql2.mongodb.net/?appName=Cluster0";

// Connect function
export async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully via Mongoose");
  } catch (err) {
    console.error("MongoDB Mongoose connection error:", err);
    throw err;
  }
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

export const EmployeeModel = mongoose.model("Employee", EmployeeSchema);

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

export const PaidRecordModel = mongoose.model("PaidRecord", PaidRecordSchema);

// 3. Settings Schema
export const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

export const SettingsModel = mongoose.model("Settings", SettingsSchema);

// 4. User Schema (Simple Credentials Authentication)
export const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

export const UserModel = mongoose.model("User", UserSchema);
