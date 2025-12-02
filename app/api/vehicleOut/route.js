import { connectDB } from "@/lib/mongodb";
import Parking from "@/models/Parking";

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const { vehicleNumber, outTime } = body;

    if (!vehicleNumber || !outTime) {
      return Response.json(
        { success: false, message: "Missing vehicleNumber or outTime" },
        { status: 400 }
      );
    }

    // Find active entry (inside parking)
    const entry = await Parking.findOne({
      vehicleNumber,
      outTime: null, // means currently inside
    });

    if (!entry) {
      return Response.json(
        {
          success: false,
          message: "Vehicle not found or already logged out",
        },
        { status: 404 }
      );
    }

    // Update the outTime
    entry.outTime = outTime;
    await entry.save();

    return Response.json({
      success: true,
      message: "Vehicle successfully logged OUT",
      data: entry,
    });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
