// import { connectDB } from "@/lib/mongodb";
// import Parking from "@/models/Parking";


import { connectDB } from "@/lib/mongodb";
import Parking from "@/models/Parking";

// export async function GET(req) {
//   await connectDB();

//   const { searchParams } = new URL(req.url);
//   const vehicleNumber = searchParams.get("vehicleNumber");

//   if (!vehicleNumber) {
//     return Response.json(
//       { message: "Vehicle number missing" },
//       { status: 400 }
//     );
//   }

//   const existing = await Parking.findOne({ vehicleNumber });

//   if (!existing) {
//     return Response.json({
//       found: false,
//       message: "Vehicle not found. You can log it in.",
//     });
//   }

//   if (existing.outTime === null) {
//     return Response.json({
//       found: true,
//       inside: true,
//       message: "This vehicle is already inside.",
//       data: existing,
//     });
//   }

//   return Response.json({
//     found: true,
//     inside: false,
//     message: "Vehicle exists but is currently OUT.",
//     data: existing,
//   });
// }
export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const vehicleNumber = searchParams.get("vehicleNumber");

  if (!vehicleNumber) {
    return Response.json(
      { message: "Vehicle number missing" },
      { status: 400 }
    );
  }

  // 🔥 FIXED — Find ONLY the active (inside) entry
  const activeEntry = await Parking.findOne({
    vehicleNumber,
    outTime: null,
  });

  if (!activeEntry) {
    return Response.json({
      found: false,
      inside: false,
      message: "Vehicle not found or already out",
    });
  }

  return Response.json({
    found: true,
    inside: true,
    message: "This vehicle is already inside.",
    data: activeEntry,
  });
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json(); // <-- JSON, NOT FormData

    const {
      vehicleNumber,
      driverName,
      phone,
      advanceAmount,
      inTime
    } = body;

    if (!vehicleNumber) {
      return Response.json(
        { error: "Vehicle number is required" },
        { status: 400 }
      );
    }

    // Check if vehicle is already inside (outTime null)
    const activeEntry = await Parking.findOne({
      vehicleNumber,
      outTime: null,
    });

    if (activeEntry) {
      return Response.json(
        {
          status: "already_inside",
          message: "This vehicle is already inside",
          data: activeEntry,
        },
        { status: 200 }
      );
    }

    // Create new entry
    const newEntry = await Parking.create({
      vehicleNumber,
      driverName,
      phone,
      advanceAmount,
      inTime,
      outTime: null,
    });

    return Response.json(
      {
        status: "new_entry",
        message: "Vehicle logged in successfully",
        data: newEntry,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}