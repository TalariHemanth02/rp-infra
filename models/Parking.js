import mongoose from "mongoose";

const parkingSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true },
    driverName: String,
    phone: String,
    advanceAmount: Number,
    inTime: { type: Date, required: true },
    outTime: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent OverwriteModelError
export default mongoose.models.Parking || mongoose.model("Parking", parkingSchema);
