"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const BookingPage = () => {
  const searchParams = useSearchParams();

  // Movie + showtime passed from details page
  const movieTitle = searchParams.get("title") || "Selected Movie";
  const showtime = searchParams.get("showtime") || "Selected Showtime";

  // Static pricing for demo purposes
  const PRICES = {
    adult: 12,
    child: 8,
    senior: 10,
  };
  // Ticket quantity states
  const [adultQty, setAdultQty] = useState(0);
  const [childQty, setChildQty] = useState(0);
  const [seniorQty, setSeniorQty] = useState(0);

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Demo occupied seats
  const occupiedSeats = ["A3", "B5", "C2", "D4"];

  const rows = ["A", "B", "C", "D", "E", "F"];
  const seatsPerRow = 8;

  const totalTickets = adultQty + childQty + seniorQty;
  // Update total price whenever ticket quantities change
  useEffect(() => {
    setTotalPrice(
      adultQty * PRICES.adult +
        childQty * PRICES.child +
        seniorQty * PRICES.senior
    );
  }, [adultQty, childQty, seniorQty]);

  // Handle seat selection
  const handleSeatClick = (seatId: string) => {
    if (occupiedSeats.includes(seatId)) return;

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((seat) => seat !== seatId));
    } else {
      if (selectedSeats.length >= totalTickets) return;
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Booking Page (Prototype)
        </h1>

        {/* Movie Info */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <p><strong>Movie:</strong> {movieTitle}</p>
          <p><strong>Showtime:</strong> {showtime}</p>
        </div>

        {/* Ticket Quantity */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-1">
              Adult (${PRICES.adult})
            </label>
            <input
              type="number"
              min={0}
              value={adultQty}
              onChange={(e) => setAdultQty(parseInt(e.target.value) || 0)}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Child (${PRICES.child})
            </label>
            <input
              type="number"
              min={0}
              value={childQty}
              onChange={(e) => setChildQty(parseInt(e.target.value) || 0)}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Senior (${PRICES.senior})
            </label>
            <input
              type="number"
              min={0}
              value={seniorQty}
              onChange={(e) => setSeniorQty(parseInt(e.target.value) || 0)}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        {/* Screen */}
        <div className="relative mb-10">
          <div className="h-8 bg-gray-300 rounded-t-lg w-3/4 mx-auto mb-6 flex items-center justify-center">
            <span className="text-gray-600 text-sm font-medium">SCREEN</span>
          </div>
        </div>

        {/* Seats */}
        <div className="mb-8">
          {rows.map((row) => (
            <div key={row} className="flex justify-center mb-2">
              <div className="w-6 flex items-center justify-center font-bold text-gray-600">
                {row}
              </div>
              <div className="flex space-x-2">
                {Array.from({ length: seatsPerRow }, (_, i) => {
                  const seatId = `${row}${i + 1}`;
                  const isSelected = selectedSeats.includes(seatId);
                  const isOccupied = occupiedSeats.includes(seatId);

                  return (
                    <button
                      key={seatId}
                      disabled={isOccupied}
                      onClick={() => handleSeatClick(seatId)}
                      className={`w-8 h-8 rounded ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : isOccupied
                          ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                          : "bg-gray-200 hover:bg-gray-300"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t pt-6">
          <p>
            <strong>Selected Seats:</strong>{" "}
            {selectedSeats.length > 0
              ? selectedSeats.join(", ")
              : "None"}
          </p>
          <p className="mt-2">
            <strong>Total Tickets:</strong> {totalTickets}
          </p>
          <p className="mt-2 text-xl font-bold">
            Total: ${totalPrice.toFixed(2)}
          </p>

          <button
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded disabled:bg-gray-400"
            disabled={selectedSeats.length === 0}
          >
            Confirm Booking (UI Only)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;