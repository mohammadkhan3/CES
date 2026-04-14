"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TicketLine = {
  type: string;
  quantity: number;
  pricePerTicket: number;
  subtotal: number;
};

type SummaryData = {
  movie: { title: string; rating?: string; genre?: string; poster_url?: string };
  show: { date: string; time: string; showroom: { name: string }; display: string };
  selectedSeats: { seatId: string; seatLabel: string }[];
  ticketSummary: TicketLine[];
  totalTickets: number;
  totalBeforeTax: number;
  email: string;
};

type PendingBooking = {
  showId: string;
  title: string;
  date: string;
  time: string;
  showroom: string;
  posterUrl: string;
  rating: string;
  genre: string;
  adultQty: number;
  childQty: number;
  seniorQty: number;
  selectedSeatIds: string[];
  selectedSeatLabels: string[];
};

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function formatDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
}

function CheckoutContent() {
  const router = useRouter();

  const [pending,      setPending]      = useState<PendingBooking | null>(null);
  const [summary,      setSummary]      = useState<SummaryData | null>(null);
  const [email,        setEmail]        = useState("");
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailError,   setEmailError]   = useState("");
  const [loading,      setLoading]      = useState(true);
  const [apiError,     setApiError]     = useState("");
  const [notFound,     setNotFound]     = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingBooking");
    if (!raw) { setNotFound(true); setLoading(false); return; }

    const state: PendingBooking = JSON.parse(raw);
    setPending(state);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userEmail = user.email || "";
    setEmail(userEmail);

    const load = async () => {
      try {
        const res = await fetch("/api/booking/checkout-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(userEmail ? { "X-User-Email": userEmail } : {}),
          },
          body: JSON.stringify({
            showId:          state.showId,
            selectedSeatIds: state.selectedSeatIds,
            ticketCounts: {
              adult:  state.adultQty,
              child:  state.childQty,
              senior: state.seniorQty,
            },
            email: userEmail,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setApiError(json.message || "Could not load order summary.");
          return;
        }

        setSummary(json.data);
        if (json.data?.email) setEmail(json.data.email);
      } catch {
        setApiError("Could not connect to server.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (notFound) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-zinc-400 uppercase tracking-widest text-xs">No booking found.</p>
        <Link href="/" className="text-xs uppercase tracking-widest border border-zinc-700 px-4 py-2 hover:border-white transition">
          Back to Movies
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500 uppercase tracking-widest text-xs animate-pulse">Loading order summary...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-red-400 uppercase tracking-widest text-xs">{apiError}</p>
        <Link href="/" className="text-xs uppercase tracking-widest border border-zinc-700 px-4 py-2 hover:border-white transition">
          Back to Movies
        </Link>
      </div>
    );
  }

  const handleProceedToPayment = () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    sessionStorage.setItem("pendingBooking", JSON.stringify({ ...pending, confirmedEmail: email, summary }));
    router.push("/payment");
  };

  // Fallback display values from sessionStorage if summary not available
  const displayTitle    = summary?.movie?.title        || pending?.title    || "";
  const displayDate     = summary?.show?.date          || pending?.date     || "";
  const displayTime     = summary?.show?.time          || pending?.time     || "";
  const displayShowroom = summary?.show?.showroom?.name || pending?.showroom || "";
  const displayPoster   = summary?.movie?.poster_url   || pending?.posterUrl || "";
  const displayRating   = summary?.movie?.rating       || pending?.rating   || "";
  const displayGenre    = summary?.movie?.genre        || pending?.genre    || "";
  const displaySeats    = summary?.selectedSeats?.map((s) => s.seatLabel) || pending?.selectedSeatLabels || [];

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <Link href="/booking" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition mb-8 inline-flex items-center gap-2">
          ← Back to Seats
        </Link>

        <h1 className="font-diplomata text-4xl uppercase tracking-wide mb-10 mt-4">Order Summary</h1>

        {/* Movie info */}
        <div className="flex gap-6 mb-6 border border-zinc-800 rounded bg-zinc-950 p-6">
          {displayPoster && (
            <img src={displayPoster} alt={displayTitle} className="w-20 h-28 object-cover rounded border border-zinc-800 flex-shrink-0" />
          )}
          <div className="flex flex-col justify-center gap-1">
            <h2 className="font-diplomata text-2xl uppercase tracking-wide">{displayTitle}</h2>
            <div className="flex gap-3 text-xs uppercase tracking-widest mt-1">
              {displayRating && <span className="text-red-500 font-bold">{displayRating}</span>}
              {displayGenre  && <span className="text-zinc-400">{displayGenre}</span>}
            </div>
            <p className="text-sm text-zinc-300 mt-2">
              {formatDate(displayDate)}&nbsp;&nbsp;·&nbsp;&nbsp;
              <span className="text-white font-bold">{displayTime}</span>
            </p>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{displayShowroom}</p>
          </div>
        </div>

        {/* Tickets + seats */}
        <div className="border border-zinc-800 rounded bg-zinc-950 p-6 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 border-b border-zinc-800 pb-3">
            Tickets &amp; Seats
          </h3>
          <div className="space-y-3 text-sm">
            {summary?.ticketSummary?.map((line) => (
              <div key={line.type} className="flex justify-between">
                <span className="text-zinc-300 capitalize">{line.type.toLowerCase()} × {line.quantity}</span>
                <span className="text-white">${line.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Selected Seats</p>
            <div className="flex flex-wrap gap-2">
              {displaySeats.map((s) => (
                <span key={s} className="text-xs bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-white font-bold">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Price summary */}
        <div className="border border-zinc-800 rounded bg-zinc-950 p-6 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 border-b border-zinc-800 pb-3">
            Price Summary
          </h3>
          <div className="space-y-2 text-sm text-zinc-400 mb-4">
            {summary?.ticketSummary?.map((line) => (
              <div key={line.type} className="flex justify-between">
                <span className="capitalize">{line.type.toLowerCase()} (${line.pricePerTicket.toFixed(2)}) × {line.quantity}</span>
                <span>${line.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-800 pt-4 flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-widest text-zinc-400">Total (before tax)</span>
            <span className="text-2xl font-bold text-white">${summary?.totalBeforeTax?.toFixed(2) ?? "—"}</span>
          </div>
        </div>

        {/* Email */}
        <div className="border border-zinc-800 rounded bg-zinc-950 p-6 mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 border-b border-zinc-800 pb-3">
            Confirmation Email
          </h3>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Your booking confirmation will be sent to this address.
          </p>

          {emailEditing ? (
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="Enter email address"
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-white outline-none px-4 py-2.5 text-sm rounded transition text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!validateEmail(email)) { setEmailError("Invalid email address."); return; }
                    setEmailEditing(false);
                    setEmailError("");
                  }}
                  className="text-xs uppercase tracking-widest border border-white px-4 py-2 hover:bg-white hover:text-black transition"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setEmailEditing(false)}
                  className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm text-white font-bold">{email || "—"}</span>
              <button
                onClick={() => setEmailEditing(true)}
                className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition border border-zinc-700 px-3 py-1 rounded hover:border-zinc-500"
              >
                Change
              </button>
            </div>
          )}

          {emailError && (
            <p className="text-xs text-red-400 uppercase tracking-widest mt-2">{emailError}</p>
          )}
        </div>

        <button
          onClick={handleProceedToPayment}
          className="w-full border border-white hover:bg-white hover:text-black transition py-4 text-sm font-bold uppercase tracking-widest"
        >
          Proceed to Payment
        </button>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500 uppercase tracking-widest text-xs animate-pulse">Loading...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}