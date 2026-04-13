"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Seat = {
  seatId: string;
  seatLabel: string;
  row: string;
  seatNumber: string;
  status: "available" | "booked";
  isBooked: boolean;
};

type SeatMapResponse = {
  data: {
    showId: string;
    showroom: {
      id: string;
      name: string;
      numberOfSeats: number;
    };
    layout: {
      rows: string[];
      seatsPerRow: number;
    };
    seats: Seat[];
  };
};

type TicketSummaryItem = {
  type: string;
  quantity: number;
  pricePerTicket: number;
  subtotal: number;
};

type CheckoutSummaryResponse = {
  data: {
    email: string;
    movie: {
      id: string;
      title: string;
      description: string;
      genre: string;
      rating: string;
      status: string;
      poster_url: string;
      trailer_url: string;
    };
    selectedSeats: Array<{
      seatId: string;
      seatLabel: string;
      row: string;
      seatNumber: string;
    }>;
    show: {
      id: string;
      date: string;
      time: string;
      duration: number;
      display: string;
      showroom: {
        id: string;
        name: string;
      };
    };
    ticketSummary: TicketSummaryItem[];
    totalBeforeTax: number;
    totalTickets: number;
  };
};

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const showId = searchParams.get("showId") || "";
  const movieTitleFromQuery = searchParams.get("title") || "Selected Movie";
  const showtimeFromQuery = searchParams.get("showtime") || "Selected Showtime";

  const [adultQty, setAdultQty] = useState(0);
  const [childQty, setChildQty] = useState(0);
  const [seniorQty, setSeniorQty] = useState(0);

  const [seatMap, setSeatMap] = useState<SeatMapResponse["data"] | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummaryResponse["data"] | null>(null);

  const [email, setEmail] = useState("");
  const [pageStep, setPageStep] = useState<"booking" | "summary" | "payment">("booking");

  const [loadingSeats, setLoadingSeats] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");

  const totalTickets = adultQty + childQty + seniorQty;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = sessionStorage.getItem("pendingCheckout");
    if (!saved) return;

    try {
      const data = JSON.parse(saved);

      if (data.showId && data.showId === showId) {
        setAdultQty(Number(data.adultQty || 0));
        setChildQty(Number(data.childQty || 0));
        setSeniorQty(Number(data.seniorQty || 0));
        setSelectedSeatIds(Array.isArray(data.selectedSeatIds) ? data.selectedSeatIds : []);
      }

      sessionStorage.removeItem("pendingCheckout");
    } catch {
      sessionStorage.removeItem("pendingCheckout");
    }
  }, [showId]);

  useEffect(() => {
    if (!showId) return;

    let cancelled = false;

    async function loadSeatMap() {
      try {
        setLoadingSeats(true);
        setError("");

        const res = await fetch(`/api/booking/showtimes/${showId}/seats`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.message || "Failed to load seat map.");
        }

        if (!cancelled) {
          setSeatMap(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load seat map.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSeats(false);
        }
      }
    }

    loadSeatMap();

    return () => {
      cancelled = true;
    };
  }, [showId]);

  const seatsByRow = useMemo(() => {
    if (!seatMap) return {};

    return seatMap.seats.reduce<Record<string, Seat[]>>((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      acc[seat.row].sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber));
      return acc;
    }, {});
  }, [seatMap]);

  const selectedSeatLabels = useMemo(() => {
    if (!seatMap) return [];
    return seatMap.seats
      .filter((seat) => selectedSeatIds.includes(seat.seatId))
      .map((seat) => seat.seatLabel);
  }, [seatMap, selectedSeatIds]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.isBooked) return;
    if (totalTickets <= 0) {
      setError("Please select at least one ticket.");
      return;
    }

    setError("");

    if (selectedSeatIds.includes(seat.seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
      return;
    }

    if (selectedSeatIds.length >= totalTickets) {
      setError("Selected seats must match the number of tickets.");
      return;
    }

    setSelectedSeatIds((prev) => [...prev, seat.seatId]);
  };

  useEffect(() => {
    if (selectedSeatIds.length > totalTickets) {
      setSelectedSeatIds((prev) => prev.slice(0, totalTickets));
    }
  }, [totalTickets, selectedSeatIds.length]);

  const handleProceedToCheckout = async () => {
    setError("");
    setCheckoutSummary(null);

    if (!showId) {
      setError("Missing showId in the booking link.");
      return;
    }

    if (totalTickets <= 0) {
      setError("Please select at least one ticket.");
      return;
    }

    if (selectedSeatIds.length !== totalTickets) {
      setError("Selected seats must match the number of tickets.");
      return;
    }

    try {
      setLoadingSummary(true);

      const storedUser =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")
          : {};

      const currentEmail = storedUser?.email || "";

      if (!currentEmail) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "pendingCheckout",
            JSON.stringify({
              showId,
              adultQty,
              childQty,
              seniorQty,
              selectedSeatIds
            })
          );
        }

        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const res = await fetch("/api/booking/checkout-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": currentEmail,
        },
        body: JSON.stringify({
          showId,
          selectedSeatIds,
          ticketCounts: {
            adult: adultQty,
            child: childQty,
            senior: seniorQty,
          },
        }),
      });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.message || "Failed to build checkout summary.");
        }

        setCheckoutSummary(json.data);
        setEmail(json.data.email || currentEmail || "");
        setPageStep("summary");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to build checkout summary.");
      } finally {
        setLoadingSummary(false);
      }
    };

    const handleContinueToPayment = async () => {
      if (!checkoutSummary) return;

      try {
        setLoadingSummary(true);
        setError("");

        const storedUser =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("user") || "{}")
            : {};

        const currentEmail = storedUser?.email || "";

        const res = await fetch("/api/booking/checkout-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Email": currentEmail,
          },
          body: JSON.stringify({
            showId,
            selectedSeatIds,
            ticketCounts: {
              adult: adultQty,
              child: childQty,
              senior: seniorQty,
            },
            email,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.message || "Failed to confirm checkout summary.");
        }

        setCheckoutSummary(json.data);
        setEmail(json.data.email || email);
        setPageStep("payment");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to continue to payment.");
      } finally {
        setLoadingSummary(false);
      }
    };

    if (!showId) {
      return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 text-black">
          <div className="p-6 bg-white rounded-lg shadow-lg max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Booking Page</h1>
            <p className="text-red-600">
              Missing showId in URL. Open this page from a showtime selection link.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 text-black">
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">Booking Page</h1>

          {error && (
            <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {pageStep === "booking" && (
            <>
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <p>
                  <strong>Movie:</strong> {movieTitleFromQuery}
                </p>
                <p>
                  <strong>Showtime:</strong> {showtimeFromQuery}
                </p>
                {seatMap?.showroom?.name && (
                  <p>
                    <strong>Showroom:</strong> {seatMap.showroom.name}
                  </p>
                )}
              </div>

              <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium mb-1">Adult Tickets</label>
                  <input
                    type="number"
                    min={0}
                    value={adultQty}
                    onChange={(e) => setAdultQty(parseInt(e.target.value) || 0)}
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Child Tickets</label>
                  <input
                    type="number"
                    min={0}
                    value={childQty}
                    onChange={(e) => setChildQty(parseInt(e.target.value) || 0)}
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Senior Tickets</label>
                  <input
                    type="number"
                    min={0}
                    value={seniorQty}
                    onChange={(e) => setSeniorQty(parseInt(e.target.value) || 0)}
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>

              <div className="relative mb-10">
                <div className="h-8 bg-gray-300 rounded-t-lg w-3/4 mx-auto mb-6 flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">SCREEN</span>
                </div>
              </div>

              {loadingSeats ? (
                <p className="text-center mb-8">Loading seat map...</p>
              ) : (
                <div className="mb-8">
                  {seatMap?.layout?.rows?.map((row) => (
                    <div key={row} className="flex justify-center mb-2">
                      <div className="w-6 flex items-center justify-center font-bold text-black">
                        {row}
                      </div>
                      <div className="flex space-x-2">
                        {(seatsByRow[row] || []).map((seat) => {
                          const isSelected = selectedSeatIds.includes(seat.seatId);

                          return (
                            <button
                              key={seat.seatId}
                              disabled={seat.isBooked}
                              onClick={() => handleSeatClick(seat)}
                              className={`w-10 h-10 rounded text-sm ${isSelected
                                ? "bg-blue-600 text-white"
                                : seat.isBooked
                                  ? "bg-gray-500 text-gray-200 cursor-not-allowed"
                                  : "bg-gray-200 hover:bg-gray-300"
                                }`}
                              title={seat.seatLabel}
                            >
                              {seat.seatNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-6">
                <p>
                  <strong>Selected Seats:</strong>{" "}
                  {selectedSeatLabels.length > 0 ? selectedSeatLabels.join(", ") : "None"}
                </p>
                <p className="mt-2">
                  <strong>Total Tickets:</strong> {totalTickets}
                </p>

                <button
                  className="mt-4 w-full bg-blue-600 text-white py-3 rounded disabled:bg-gray-400"
                  disabled={loadingSummary || loadingSeats || selectedSeatIds.length === 0}
                  onClick={handleProceedToCheckout}
                >
                  {loadingSummary ? "Loading Summary..." : "Proceed to Checkout"}
                </button>
              </div>
            </>
          )}

          {pageStep === "summary" && checkoutSummary && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Order Summary</h2>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p>
                  <strong>Movie:</strong> {checkoutSummary.movie.title}
                </p>
                <p>
                  <strong>Showtime:</strong> {checkoutSummary.show.display}
                </p>
                <p>
                  <strong>Selected Seats:</strong>{" "}
                  {checkoutSummary.selectedSeats.map((seat) => seat.seatLabel).join(", ")}
                </p>
                <p>
                  <strong>Total Tickets:</strong> {checkoutSummary.totalTickets}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Ticket Breakdown</h3>
                <div className="space-y-2">
                  {checkoutSummary.ticketSummary.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <span>
                        {item.type} x {item.quantity}
                      </span>
                      <span>
                        ${item.pricePerTicket.toFixed(2)} each — ${item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-lg font-bold">
                  Total Before Tax: ${checkoutSummary.totalBeforeTax.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block font-medium mb-1">Email for Confirmation</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 bg-gray-200 py-3 rounded"
                  onClick={() => setPageStep("booking")}
                >
                  Back
                </button>
                <button
                  className="flex-1 bg-blue-600 text-white py-3 rounded disabled:bg-gray-400"
                  onClick={handleContinueToPayment}
                  disabled={loadingSummary || !email.trim()}
                >
                  {loadingSummary ? "Continuing..." : "Continue to Payment"}
                </button>
              </div>
            </div>
          )}

          {pageStep === "payment" && checkoutSummary && (
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-bold">Payment Processing Page</h2>
              <p className="text-gray-700">
                This is a mock payment page for Deliverable 6.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg text-left space-y-2">
                <p>
                  <strong>Movie:</strong> {checkoutSummary.movie.title}
                </p>
                <p>
                  <strong>Showtime:</strong> {checkoutSummary.show.display}
                </p>
                <p>
                  <strong>Seats:</strong>{" "}
                  {checkoutSummary.selectedSeats.map((seat) => seat.seatLabel).join(", ")}
                </p>
                <p>
                  <strong>Email:</strong> {email}
                </p>
                <p>
                  <strong>Total Before Tax:</strong> ${checkoutSummary.totalBeforeTax.toFixed(2)}
                </p>
              </div>

              <button
                className="w-full bg-gray-200 py-3 rounded"
                onClick={() => setPageStep("summary")}
              >
                Back to Summary
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }