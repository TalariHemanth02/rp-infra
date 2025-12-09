

"use client";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FloatingBG from "./components/FloatingBg";

export default function Home({
  autoUpdate = true,
  updateEveryMs = 60000,
  className = "border border-black px-2 py-1 rounded-lg w-full",
}) {
  const [status, setStatus] = useState("in");

  const vehicleRef = useRef(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const advanceRef = useRef(null);
  const searchRef = useRef(null);

  // focus on initial mount (will also be triggered by onAnimationComplete,
  // but this ensures focus if animation is skipped)
  useEffect(() => {
    if (status === "in") {
      // small delay to ensure element is mounted
      setTimeout(() => vehicleRef.current?.focus(), 50);
    } else {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, []); // run once on mount

  // keep your datetime helper
  function toLocalDatetimeValue(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const [value, setValue] = useState(() => toLocalDatetimeValue());
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const [searchVehicleNumber, setSearchVehicleNumber] = useState("");
  const [vehicleInside, setVehicleInside] = useState(false);

  // Out section data (from backend)
  const [storedInTime, setStoredInTime] = useState("");
  const [storedAdvance, setStoredAdvance] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);

  useEffect(() => {
    if (!autoUpdate) return;
    const id = setInterval(() => {
      setValue(toLocalDatetimeValue());
    }, updateEveryMs);

    setValue(toLocalDatetimeValue());
    return () => clearInterval(id);
  }, [autoUpdate, updateEveryMs]);

  // ---------------------
  // 🚗 IN SUBMIT FUNCTION
  // ---------------------
  const submitClicked = async () => {
    setLoading(true);

    const res = await fetch("/api/vehicleIn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleNumber,
        driverName: name,
        phone: phoneNumber,
        advanceAmount,
        inTime: value,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.status === "already_inside") {
      setDialogMessage("This vehicle is already inside.");
    } else if (data.status === "new_entry") {
      setDialogMessage("Vehicle entry successful!");
      // optionally reset fields or keep them — up to you
    } else {
      setDialogMessage(data.error || "Something went wrong");
    }

    setDialogOpen(true);
  };

  // -----------------------
  // 🔢 DUE CALCULATION LOGIC
  // -----------------------

  function calculateDue(inTime, outTime, advance) {
    if (!inTime || !outTime) {
      return {
        days: 0,
        parkingCharge: 0,
        advance: Number(advance) || 0,
        due: 0,
      };
    }

    const inDate = new Date(inTime);
    const outDate = new Date(outTime);

    const msPerDay = 1000 * 60 * 60 * 24;

    // Difference in days (minimum 1)
    let diffDays = Math.ceil((outDate - inDate) / msPerDay);
    if (diffDays < 1) diffDays = 1;

    const parkingCharge = diffDays * 100; // ₹100 per day
    const advanceInt = Number(advance) || 0;

    // Calculate due (can go negative if advance > charge)
    const due = parkingCharge - advanceInt;

    return {
      days: diffDays,
      parkingCharge,
      advance: advanceInt,
      due, // <-- show negative if advance > parking charge
    };
  }

  // ----------------------
  // 🔍 SEARCH VEHICLE (OUT)
  // ----------------------
  const searchVehicle = async () => {
    if (!searchVehicleNumber.trim()) {
      setDialogMessage("Enter a vehicle number");
      setDialogOpen(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/vehicleIn?vehicleNumber=${searchVehicleNumber.toUpperCase()}`,
        { method: "GET" }
      );

      const data = await res.json();
      console.log(data.data);

      if (data.inside === true) {
        setVehicleInside(true);

        const outNow = toLocalDatetimeValue();
        const result = calculateDue(
          data.data.inTime,
          outNow,
          data.data.advanceAmount
        );

        setStoredInTime(data.data.inTime || "");
        setStoredAdvance(result.advance);
        setDueAmount(result.due); // <-- can be negative

        setDialogMessage(data.message);
        setDialogOpen(true);
      } else {
        setDialogMessage("Vehicle not found or already out");
        setDialogOpen(true);
      }
    } catch (err) {
      setDialogMessage("Server error. Try again.");
      setDialogOpen(true);
    }

    setLoading(false);
  };
  function formatDisplayTime(iso) {
    if (!iso) return "--";

    const d = new Date(iso);

    const day = d.getDate();
    const year = d.getFullYear();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const month = monthNames[d.getMonth()];

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 → 12

    return `${day} ${month} ${year} • ${hours}:${minutes} ${ampm}`;
  }
  const logVehicleOut = async () => {
    if (!vehicleInside) return;

    const outNow = toLocalDatetimeValue(); // frontend current time

    setLoading(true);

    try {
      const res = await fetch("/api/vehicleOut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNumber: searchVehicleNumber,
          outTime: outNow,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setDialogMessage("Vehicle checked out successfully!");
        setDialogOpen(true);

        // reset UI
        setVehicleInside(false);
      } else {
        setDialogMessage(data.message || "Failed to log vehicle out");
        setDialogOpen(true);
      }
    } catch (err) {
      setDialogMessage("Server error");
      setDialogOpen(true);
      setLoading(false);
    }
  };

  return (
    <>
      <FloatingBG />
      <div className="text-[#161616] flex flex-col lg:gap-8 justify-center h-screen">
        <h1 className="font-bold lg:text-5xl text-2xl lg:py-0 py-2 text-center">
          RP Infra Parking
        </h1>

        <div className="flex justify-center min-h-[60vh]">
          <div className="border border-gray-100 rounded-lg bg-blur-lg shadow-lg w-[80vw] lg:px-12 lg:py-6 px-2 py-4">
            {/* Toggle Buttons */}
            <div className="grid grid-cols-2 bg-gray-400 py-[0.1em] px-[0.3em] rounded-lg">
              <div
                onClick={() => setStatus("in")}
                className={`rounded-lg cursor-pointer transition-all duration-300 ${
                  status === "in" ? "bg-white text-[#3281EC]" : "text-[#6687A7]"
                }`}
              >
                <p className="text-center p-1">In</p>
              </div>

              <div
                onClick={() => setStatus("out")}
                className={`rounded-lg cursor-pointer transition-all duration-300 ${
                  status === "out"
                    ? "bg-white text-[#3281EC]"
                    : "text-[#6687A7]"
                }`}
              >
                <p className="text-center p-1">Out</p>
              </div>
            </div>

            {/* Animated Content */}
            <AnimatePresence mode="wait">
              {status === "in" ? (
                // -------------------------
                // 🚗 VEHICLE IN FORM
                // -------------------------
                <motion.div
                  key="in-div"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  // focus after animation completes
                  onAnimationComplete={() => {
                    // tiny delay to be extra-safe on some browsers
                    setTimeout(() => vehicleRef.current?.focus(), 20);
                  }}
                  className="grid grid-cols-2 px-4 py-6 lg:gap-8 gap-4"
                >
                  <div className="col-span-2 lg:col-span-1">
                    <p>Vehicle Number</p>
                    <input
                      ref={vehicleRef}
                      value={vehicleNumber}
                      onChange={(e) =>
                        setVehicleNumber(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") nameRef.current?.focus();
                      }}
                      className="border border-black px-2 py-1 rounded-lg w-full"
                      placeholder="EX: AP22AB1234"
                    />
                  </div>

                  {/* Driver Name */}
                  <div className="col-span-2 lg:col-span-1">
                    <p>Driver’s Name</p>
                    <input
                      ref={nameRef}
                      value={name}
                      placeholder="Name"
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") phoneRef.current?.focus();
                      }}
                      className="border border-black px-2 py-1 rounded-lg w-full"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="col-span-2 lg:col-span-1">
                    <p>Phone Number</p>
                    <input
                      ref={phoneRef}
                      value={phoneNumber}
                      placeholder="Number"
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") advanceRef.current?.focus();
                      }}
                      className="border border-black px-2 py-1 rounded-lg w-full"
                    />
                  </div>

                  {/* Date – No Enter Focus */}
                  <div className="col-span-2 lg:col-span-1">
                    <p>In Time & Date</p>
                    <input
                      type="datetime-local"
                      value={value}
                      className={className}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>

                  {/* Advance Amount */}
                  <div className="col-span-2">
                    <p>Advance Amount</p>
                    <input
                      ref={advanceRef}
                      value={advanceAmount}
                      onKeyDown={(e) => {
    if (e.key === "Enter") submitClicked();  // ← This submits
  }}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      className="border border-black px-2 py-1 rounded-lg w-full"
                      placeholder="₹ 0.00"
                    />
                  </div>
                  <div className="col-span-2 flex flex-row-reverse">
                    <button
                      onClick={submitClicked}
                      disabled={loading}
                      className="flex gap-3 justify-center items-center bg-[#137FEC] text-white px-8 py-2 rounded-lg"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <img src="/in.png" className="w-6" />
                          Log Vehicle In
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                // --------------------------
                // 🚗 VEHICLE OUT SECTION
                // --------------------------
                <motion.div
                  key="out-div"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  onAnimationComplete={() => {
                    setTimeout(() => searchRef.current?.focus(), 20);
                  }}
                  className="grid grid-cols-2 px-4 py-6 gap-8"
                >
                  <div className="col-span-2">
                    <p>Enter Vehicle Number</p>
                    <input
                      ref={searchRef}
                      value={searchVehicleNumber}
                      onChange={(e) =>
                        setSearchVehicleNumber(e.target.value.toUpperCase())
                      }
                      className="border border-black px-2 py-1 rounded-lg w-full"
                      placeholder="EX: AP22AB1234"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") searchVehicle();
                      }}
                    />
                  </div>

                  <div className="col-span-2 flex flex-row-reverse">
                    <button
                      onClick={searchVehicle}
                      className="flex gap-3 justify-center w-full items-center bg-[#137FEC] text-white px-8 py-2 rounded-lg"
                    >
                      Search
                    </button>
                  </div>

                  {vehicleInside && (
                    <>
                      <div className="col-span-2 lg:col-span-1">
                        <p>Out Time & Date</p>
                        <input
                          type="datetime-local"
                          value={value}
                          readOnly
                          className={className}
                        />
                      </div>

                      <div className="col-span-2 lg:col-span-1">
                        <p className="font-semibold">
                          In Time: {formatDisplayTime(storedInTime)}
                        </p>

                        <p className="font-semibold">
                          Advance Paid: ₹{storedAdvance ?? 0}
                        </p>

                        <p className="text-xl font-bold mt-2">
                          Due Amount: ₹{dueAmount}
                        </p>
                      </div>
                      <div className="col-span-2 flex flex-row-reverse">
                        <button
                          onClick={logVehicleOut}
                          className="flex gap-3 justify-center items-center bg-[#137FEC] text-white px-8 py-2 rounded-lg"
                        >
                          Log Vehicle Out
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 backdrop-blur-md" />
          <div className="relative bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl p-8 max-w-md w-[90%] text-center animate-fadeIn">
            <h2 className="text-xl font-bold">{dialogMessage}</h2>
            <button
              onClick={() => setDialogOpen(false)}
              className="mt-6 px-6 py-2 rounded-lg bg-[#137FEC] text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
