"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRICES = { adult: 12, child: 8, senior: 10 };

type BookingState = {
  showId: string;
  title: string;
  date: string;
  time: string;
  showroom: string;
  selectedSeatIds: string[];
  selectedSeatLabels: string[];
  adultQty: number;
  childQty: number;
  seniorQty: number;
  confirmedEmail?: string;
  summary?: {
    totalBeforeTax: number;
    ticketSummary: { type: string; quantity: number; pricePerTicket: number; subtotal: number }[];
  };
};

type SavedCard = {
  cardNumber?: string;
  last4?: string;
  cardType?: string;
};

function formatDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
}

function PaymentContent() {
  const router = useRouter();
  const [booking,  setBooking]  = useState<BookingState | null>(null);
  const [paying,   setPaying]   = useState(false);
  const [payError, setPayError] = useState("");

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingBooking");
    if (raw) setBooking(JSON.parse(raw));

    const loadProfile = async () => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user?.email) {
        setLoadingCards(false);
        return;
      }
      try {
        const res = await fetch("/api/profile", {
          headers: { "X-User-Email": user.email },
        });
        const data = await res.json();
        const cards = data?.paymentCards || data?.cards || [];
        if (Array.isArray(cards)) {
          setSavedCards(cards);
        }
      } catch (err) {
        console.error("Could not load profile cards");
      } finally {
        setLoadingCards(false);
      }
    };
    loadProfile();
  }, []);

  const handlePay = async () => {
    if (!booking) return;
    setPaying(true);
    setPayError("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const email = booking.confirmedEmail || user.email || "";

    try {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(email ? { "X-User-Email": email } : {}),
        },
        body: JSON.stringify({
          showId:          booking.showId,
          selectedSeatIds: booking.selectedSeatIds,
          ticketCounts: {
            adult:  booking.adultQty,
            child:  booking.childQty,
            senior: booking.seniorQty,
          },
          email,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setPayError(json.message || "Could not confirm booking. Please try again.");
        return;
      }

      sessionStorage.setItem(
        "confirmedBooking",
        JSON.stringify({ ...booking, bookingId: json.data.bookingId, totalPrice: json.data.totalPrice, email: json.data.email })
      );
      sessionStorage.removeItem("pendingBooking");
      router.push(`/booking-confirmation?bookingId=${json.data.bookingId}`);
    } catch {
      setPayError("Could not connect to server. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const subtotal = booking?.summary?.totalBeforeTax
    ?? (booking
      ? booking.adultQty  * PRICES.adult  +
        booking.childQty  * PRICES.child  +
        booking.seniorQty * PRICES.senior
      : 0);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-xl mx-auto">

        <Link href="/checkout" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition mb-8 inline-flex items-center gap-2">
          ← Back to Order Summary
        </Link>

        <h1 className="font-diplomata text-4xl uppercase tracking-wide mb-2 mt-4">Payment</h1>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-10">Secure Payment Processing</p>

        {booking && (
          <div className="border border-zinc-800 rounded bg-zinc-950 p-5 mb-8 space-y-1.5 text-sm">
            <p className="font-bold text-white uppercase tracking-wide">{booking.title}</p>
            <p className="text-zinc-400">{formatDate(booking.date)}&nbsp;·&nbsp;{booking.time}</p>
            <p className="text-zinc-500 text-xs uppercase tracking-widest">{booking.showroom}</p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {booking.selectedSeatLabels?.map((s) => (
                <span key={s} className="text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-white font-bold">
                  {s}
                </span>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-3 mt-2 flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-widest text-zinc-500">Total Due</span>
              <span className="text-xl font-bold">${subtotal.toFixed(2)}</span>
            </div>
            {booking.confirmedEmail && (
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest pt-1">
                Confirmation → {booking.confirmedEmail}
              </p>
            )}
          </div>
        )}

        <div className="border border-zinc-800 rounded bg-zinc-950 p-6 space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-3">
            Card Details
          </h2>

          {loadingCards ? (
            <div className="h-10 w-full bg-zinc-900 border border-zinc-800 animate-pulse rounded" />
          ) : savedCards.length > 0 ? (
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Select Saved Card</label>
              <select
                value={selectedCardIndex}
                onChange={(e) => setSelectedCardIndex(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm rounded text-white outline-none appearance-none"
              >
                {savedCards.map((card, index) => {
                  const displayLast4 = card.last4 || card.cardNumber?.slice(-4) || "****";
                  return (
                    <option key={index} value={index}>
                      {card.cardType || "Card"} ending in {displayLast4}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Cardholder Name</label>
                <input
                  type="text"
                  disabled
                  placeholder="Full name on card"
                  className="w-full bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm rounded text-zinc-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    placeholder="•••• •••• •••• ••••"
                    className="w-full bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm rounded text-zinc-500 cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-30">
                    <div className="w-6 h-4 rounded-sm bg-red-500" />
                    <div className="w-6 h-4 rounded-sm bg-yellow-400 -ml-2 opacity-80" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">Expiry</label>
                  <input
                    type="text"
                    disabled
                    placeholder="MM / YY"
                    className="w-full bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm rounded text-zinc-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500">CVV</label>
                  <input
                    type="text"
                    disabled
                    placeholder="•••"
                    className="w-full bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm rounded text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </>
          )}

          <div className="border border-yellow-900/40 bg-yellow-950/10 rounded px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-yellow-700 text-center">
              Mockup — No real charge will be made
            </p>
          </div>

          {payError && (
            <p className="text-xs text-red-400 uppercase tracking-widest border border-red-900/60 bg-red-950/20 rounded px-3 py-2">
              {payError}
            </p>
          )}

          <button
            onClick={handlePay}
            disabled={paying || !booking}
            className="w-full border border-white hover:bg-white hover:text-black transition py-4 text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white rounded"
          >
            {paying ? "Processing..." : `Pay $${subtotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500 uppercase tracking-widest text-xs animate-pulse">Loading...</p>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}