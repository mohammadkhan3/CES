"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ConfirmedBooking = {
  bookingId: string;
  title: string;
  date: string;
  time: string;
  showroom: string;
  posterUrl?: string;
  rating?: string;
  genre?: string;
  selectedSeatLabels: string[];
  adultQty: number;
  childQty: number;
  seniorQty: number;
  totalPrice: number;
  email: string;
  summary?: {
    ticketSummary: { type: string; quantity: number; pricePerTicket: number; subtotal: number }[];
  };
};

function formatDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
}

function ConfirmationContent() {
  const sp = useSearchParams();
  const bookingId = sp.get("bookingId") || "";
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("confirmedBooking");
    if (raw) {
      setBooking(JSON.parse(raw));
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">

        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center mb-6">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="font-diplomata text-4xl uppercase tracking-wide mb-2">Booking Confirmed</h1>
          {bookingId && (
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-2">
              Booking ID: <span className="text-white font-bold">{bookingId}</span>
            </p>
          )}
        </div>

        {booking ? (
          <div className="space-y-4">

            <div className="flex gap-6 border border-zinc-800 rounded bg-zinc-950 p-6">
              {booking.posterUrl && (
                <img
                  src={booking.posterUrl}
                  alt={booking.title}
                  className="w-20 h-28 object-cover rounded border border-zinc-800 flex-shrink-0"
                />
              )}
              <div className="flex flex-col justify-center gap-1">
                <h2 className="font-diplomata text-2xl uppercase tracking-wide">{booking.title}</h2>
                <div className="flex gap-3 text-xs uppercase tracking-widest mt-1">
                  {booking.rating && <span className="text-red-500 font-bold">{booking.rating}</span>}
                  {booking.genre  && <span className="text-zinc-400">{booking.genre}</span>}
                </div>
                <p className="text-sm text-zinc-300 mt-2">
                  {formatDate(booking.date)}&nbsp;&nbsp;·&nbsp;&nbsp;
                  <span className="text-white font-bold">{booking.time}</span>
                </p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{booking.showroom}</p>
              </div>
            </div>

            <div className="border border-zinc-800 rounded bg-zinc-950 p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 border-b border-zinc-800 pb-3">
                Tickets &amp; Seats
              </h3>
              <div className="space-y-2 text-sm mb-4">
                {booking.summary?.ticketSummary?.map((line) => (
                  <div key={line.type} className="flex justify-between">
                    <span className="text-zinc-300 capitalize">{line.type.toLowerCase()} × {line.quantity}</span>
                    <span className="text-white">${line.subtotal.toFixed(2)}</span>
                  </div>
                )) ?? (
                  <>
                    {booking.adultQty  > 0 && <div className="flex justify-between"><span className="text-zinc-300">Adult × {booking.adultQty}</span></div>}
                    {booking.childQty  > 0 && <div className="flex justify-between"><span className="text-zinc-300">Child × {booking.childQty}</span></div>}
                    {booking.seniorQty > 0 && <div className="flex justify-between"><span className="text-zinc-300">Senior × {booking.seniorQty}</span></div>}
                  </>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Seats</p>
                <div className="flex flex-wrap gap-1.5">
                  {booking.selectedSeatLabels?.map((s) => (
                    <span key={s} className="text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-white font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-zinc-800 rounded bg-zinc-950 p-6">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-widest text-zinc-400">Total Paid</span>
                <span className="text-2xl font-bold text-white">${booking.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="border border-zinc-800 rounded bg-zinc-950 p-6">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Confirmation sent to</p>
              <p className="text-sm font-bold text-white">{booking.email}</p>
            </div>

          </div>
        ) : (
          <div className="border border-zinc-800 rounded bg-zinc-950 p-6 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Booking details unavailable.</p>
            {bookingId && (
              <p className="text-xs text-zinc-600 mt-2">Your booking ID is <span className="text-white">{bookingId}</span></p>
            )}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest border border-zinc-700 px-6 py-3 hover:border-white hover:text-white transition text-zinc-400"
          >
            Back to Movies
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500 uppercase tracking-widest text-xs animate-pulse">Loading...</p>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
