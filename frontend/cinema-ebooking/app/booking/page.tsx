"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const SEATS_PER_ROW = 10;

type SeatData = {
  seatId: string;
  seatLabel: string;
  row: string;
  seatNumber: string;
  isBooked: boolean;
};

function formatDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
}

function BookingContent() {
  const sp     = useSearchParams();
  const router = useRouter();

  const showId    = sp.get("show_id")    || "";
  const movieId   = sp.get("movie_id")   || "";
  const title     = sp.get("title")      || "Selected Movie";
  const date      = sp.get("date")       || "";
  const time      = sp.get("time")       || "";
  const showroom  = sp.get("showroom")   || "";
  const posterUrl = sp.get("poster_url") || "";
  const rating    = sp.get("rating")     || "";
  const genre     = sp.get("genre")      || "";

  const [adultQty,      setAdultQty]      = useState(0);
  const [childQty,      setChildQty]      = useState(0);
  const [seniorQty,     setSeniorQty]     = useState(0);
  const [seats,         setSeats]         = useState<SeatData[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SeatData[]>([]);
  const [seatsLoading,  setSeatsLoading]  = useState(true);
  const [seatsError,    setSeatsError]    = useState("");
  const [error,         setError]         = useState("");
  const [reserving,     setReserving]     = useState(false);

  const totalTickets = adultQty + childQty + seniorQty;

  useEffect(() => {
    if (!showId) { setSeatsError("No show selected."); setSeatsLoading(false); return; }
    const load = async () => {
      setSeatsLoading(true);
      setSeatsError("");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      try {
        const res = await fetch(`/api/booking/showtimes/${showId}/seats`, {
          cache: "no-store",
          headers: user?.email ? { "X-User-Email": user.email } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setSeats(Array.isArray(json?.data?.seats) ? json.data.seats : []);
      } catch {
        setSeatsError("Could not load seat map. Please try again.");
      } finally {
        setSeatsLoading(false);
      }
    };
    load();
  }, [showId]);

  useEffect(() => {
    if (selectedSeats.length > totalTickets) {
      setSelectedSeats((prev) => prev.slice(0, totalTickets));
    }
  }, [totalTickets]);

  const handleSeatClick = (seat: SeatData) => {
    if (seat.isBooked) return;
    if (selectedSeats.find((s) => s.seatId === seat.seatId)) {
      setSelectedSeats((prev) => prev.filter((s) => s.seatId !== seat.seatId));
      setError("");
      return;
    }
    if (totalTickets === 0) {
      setError("Select the number of tickets above before choosing seats.");
      return;
    }
    if (selectedSeats.length >= totalTickets) {
      setError(`You've selected ${totalTickets} seat${totalTickets > 1 ? "s" : ""} — the maximum for your order.`);
      return;
    }
    setSelectedSeats((prev) => [...prev, seat]);
    setError("");
  };

  const handleProceed = async () => {
    if (totalTickets === 0) { setError("Please select at least one ticket."); return; }
    if (selectedSeats.length !== totalTickets) {
      setError(`Please select exactly ${totalTickets} seat${totalTickets > 1 ? "s" : ""} to continue.`);
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.userId) {
      const bookingState = {
        showId, movieId, title, date, time, showroom, posterUrl, rating, genre,
        adultQty, childQty, seniorQty,
        selectedSeatIds: selectedSeats.map((s) => s.seatId),
        selectedSeatLabels: selectedSeats.map((s) => s.seatLabel),
      };
      sessionStorage.setItem("pendingBooking", JSON.stringify(bookingState));
      router.push("/login?redirect=/checkout");
      return;
    }

    setReserving(true);
    setError("");

    try {
      const res = await fetch("/api/booking/reserve-seats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": user.email || "",
        },
        body: JSON.stringify({
          showId,
          seatIds: selectedSeats.map((s) => s.seatId),
          email: user.email || "",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Could not reserve seats. Please try again.");
        return;
      }

      const bookingState = {
        showId, movieId, title, date, time, showroom, posterUrl, rating, genre,
        adultQty, childQty, seniorQty,
        selectedSeatIds: selectedSeats.map((s) => s.seatId),
        selectedSeatLabels: selectedSeats.map((s) => s.seatLabel),
        reservedUntil: json.data?.expiresAt || null,
      };
      sessionStorage.setItem("pendingBooking", JSON.stringify(bookingState));
      router.push("/checkout");
    } catch {
      setError("Could not connect to server. Please try again.");
    } finally {
      setReserving(false);
    }
  };

  // Build a lookup for quick rendering
  const seatMap = new Map(seats.map((s) => [s.seatLabel, s]));
  const selectedIds = new Set(selectedSeats.map((s) => s.seatId));

  const TicketCounter = (
    label: string,
    priceLabel: string,
    value: number,
    setter: (n: number) => void
  ) => (
    <div className="flex items-center justify-between border border-zinc-800 rounded px-4 py-3 bg-zinc-900/60">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-white">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{priceLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setter(Math.max(0, value - 1))}
          className="w-8 h-8 flex items-center justify-center rounded border border-zinc-700 text-white hover:border-red-600 hover:text-red-500 transition text-lg font-bold"
        >
          −
        </button>
        <span className="w-5 text-center text-white font-bold tabular-nums">{value}</span>
        <button
          onClick={() => setter(value + 1)}
          className="w-8 h-8 flex items-center justify-center rounded border border-zinc-700 text-white hover:border-red-600 hover:text-red-500 transition text-lg font-bold"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-5xl mx-auto">

        <Link href="/" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition mb-8 inline-flex items-center gap-2">
          ← Back to Movies
        </Link>

        <div className="flex flex-col sm:flex-row gap-6 mb-10 mt-4">
          {posterUrl && (
            <img src={posterUrl} alt={title} className="w-20 h-28 object-cover rounded border border-zinc-800 flex-shrink-0" />
          )}
          <div>
            <h1 className="font-diplomata text-3xl md:text-4xl uppercase tracking-wide mb-1">{title}</h1>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-zinc-400 mt-1">
              {rating && <span className="text-red-500 font-bold">{rating}</span>}
              {genre  && <span>{genre}</span>}
            </div>
            {date && (
              <p className="text-sm text-zinc-300 mt-3">
                {formatDate(date)}&nbsp;&nbsp;·&nbsp;&nbsp;
                <span className="text-white font-bold">{time}</span>
              </p>
            )}
            {showroom && <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{showroom}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          <div className="lg:col-span-2 space-y-10">

            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Ticket Quantities</h2>
              <div className="space-y-3">
                {TicketCounter("Adult",  "Price loaded at checkout", adultQty,  setAdultQty)}
                {TicketCounter("Child",  "Price loaded at checkout", childQty,  setChildQty)}
                {TicketCounter("Senior", "Price loaded at checkout", seniorQty, setSeniorQty)}
              </div>
              {totalTickets > 0 && (
                <p className="text-xs text-zinc-500 mt-3 uppercase tracking-widest">
                  {selectedSeats.length} of {totalTickets} seat{totalTickets > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">Select Your Seats</h2>

              <div className="mb-8 text-center">
                <div className="h-1.5 bg-gradient-to-r from-transparent via-zinc-500 to-transparent rounded-full w-3/4 mx-auto" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 mt-2">Screen</p>
              </div>

              {seatsLoading && (
                <div className="space-y-2">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="flex justify-center gap-1.5">
                      {Array.from({length: 10}).map((_, j) => (
                        <div key={j} className="w-7 h-7 bg-zinc-800 animate-pulse rounded-t-md" />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {seatsError && (
                <p className="text-xs text-red-400 uppercase tracking-widest text-center">{seatsError}</p>
              )}

              {!seatsLoading && !seatsError && (
                <div className="space-y-2 overflow-x-auto pb-2">
                  {ROWS.map((row) => {
                    const rowSeats = Array.from({length: SEATS_PER_ROW}, (_, i) => {
                      const label = `${row}${i + 1}`;
                      return seatMap.get(label) ?? null;
                    });
                    const hasAny = rowSeats.some(Boolean);
                    if (!hasAny) return null;
                    return (
                      <div key={row} className="flex items-center gap-2 justify-center min-w-max mx-auto">
                        <span className="w-5 text-xs text-zinc-600 font-bold text-right">{row}</span>
                        <div className="flex gap-1.5">
                          {rowSeats.map((seat, i) => {
                            if (!seat) {
                              return <div key={i} className="w-7 h-7" />;
                            }
                            const isSelected = selectedIds.has(seat.seatId);
                            return (
                              <button
                                key={seat.seatId}
                                disabled={seat.isBooked}
                                onClick={() => handleSeatClick(seat)}
                                title={seat.seatLabel}
                                className={[
                                  "w-7 h-7 rounded-t-md text-[10px] font-bold border transition-all duration-150 flex items-center justify-center",
                                  seat.isBooked
                                    ? "bg-zinc-800 border-zinc-700 text-zinc-600 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-red-600 border-red-500 text-white scale-110 shadow-lg shadow-red-900/40"
                                    : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer",
                                ].join(" ")}
                              >
                                {i + 1}
                              </button>
                            );
                          })}
                        </div>
                        <span className="w-5 text-xs text-zinc-600 font-bold">{row}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-6 justify-center mt-6">
                {[
                  { color: "bg-zinc-900 border-zinc-700", label: "Available" },
                  { color: "bg-red-600 border-red-500",   label: "Selected"  },
                  { color: "bg-zinc-800 border-zinc-700", label: "Booked"    },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
                    <div className={`w-4 h-4 rounded-t-sm border ${color}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-zinc-800 rounded bg-zinc-950 p-6 space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-4">
                Order Summary
              </h2>

              <div className="space-y-2 text-sm">
                {adultQty  > 0 && <div className="flex justify-between text-zinc-300"><span>Adult × {adultQty}</span></div>}
                {childQty  > 0 && <div className="flex justify-between text-zinc-300"><span>Child × {childQty}</span></div>}
                {seniorQty > 0 && <div className="flex justify-between text-zinc-300"><span>Senior × {seniorQty}</span></div>}
                {totalTickets === 0 && <p className="text-xs text-zinc-600 uppercase tracking-widest">No tickets selected</p>}
              </div>

              {selectedSeats.length > 0 && (
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Seats</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSeats.map((s) => (
                      <span key={s.seatId} className="text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-white font-bold">
                        {s.seatLabel}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-600 uppercase tracking-widest">
                  Prices confirmed at checkout
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400 uppercase tracking-widest border border-red-900/60 bg-red-950/20 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleProceed}
                disabled={selectedSeats.length === 0 || selectedSeats.length !== totalTickets || reserving}
                className="w-full border border-white hover:bg-white hover:text-black transition py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
              >
                {reserving ? "Reserving Seats..." : "Proceed to Checkout"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500 uppercase tracking-widest text-xs animate-pulse">Loading...</p>
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}