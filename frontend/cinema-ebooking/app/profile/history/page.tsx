"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Order = {
  createdAt?: string; 
  date?: string;
  show_date?: string;
  booking_date?: string;
  movieTitle?: string;
  movie_title?: string;
  title?: string;
  totalPrice?: any;
  total_price?: any;
  total?: any;
  amount?: any;
  cost?: any;
  bookingId?: string;
  booking_id?: string;
  id?: string;
  seats?: string[];
  time?: string;
};

type Recommendation = {
  title: string;
  reason: string;
  genre: string;
};

function formatDate(d: any) {
  if (!d) return "Date TBD";
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric"
    });
  } catch { 
    return String(d); 
  }
}

function HistoryContent() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [aiSource, setAiSource] = useState("");
  
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAi, setLoadingAi] = useState(true);
  
  const [orderError, setOrderError] = useState("");
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.email) {
      router.push("/login");
      return;
    }

    const fetchHistoryAndAI = async () => {
      try {
        const orderRes = await fetch("/api/orders/history", {
          headers: { "X-User-Email": user.email }
        });
        const orderJson = await orderRes.json();

        if (orderRes.ok && orderJson.success) {
          setOrders(orderJson.orders || []);
        } else {
          setOrderError(orderJson.message || "Could not load orders.");
        }
      } catch (error) {
        setOrderError("Failed to connect to order server.");
      } finally {
        setLoadingOrders(false);
      }

      try {
        const aiRes = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "X-User-Email": user.email }
        });
        const aiJson = await aiRes.json();
        if (aiRes.ok && aiJson.success) {
          setRecommendations(aiJson.recommendations || []);
          setAiSource(aiJson.source || "AI");
        } else {
          setAiError(aiJson.message || "Could not load recommendations.");
        }
      } catch {
        setAiError("Failed to connect to AI server.");
      } finally {
        setLoadingAi(false);
      }
    };

    fetchHistoryAndAI();
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition mb-8 inline-flex items-center gap-2">
          ← Back to Home
        </Link>

        <h1 className="font-diplomata text-4xl uppercase tracking-wide mb-10">My Profile</h1>

        {/* --- ORDER HISTORY SECTION --- */}
        <div className="mb-16">
          <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-6 border-b border-zinc-800 pb-4">
            Order History
          </h2>
          
          {loadingOrders ? (
             <div className="h-32 bg-zinc-900 border border-zinc-800 rounded animate-pulse flex items-center justify-center">
               <p className="text-xs uppercase tracking-widest text-zinc-600">Loading your history...</p>
             </div>
          ) : orderError ? (
            <p className="text-xs text-red-400 uppercase tracking-widest bg-red-950/20 border border-red-900/60 p-4 rounded">
              {orderError}
            </p>
          ) : orders.length === 0 ? (
            <div className="border border-zinc-800 rounded bg-zinc-950 p-8 text-center text-zinc-500 text-sm uppercase tracking-widest">
              You have no past bookings.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => {
                const rawPrice = order.totalPrice ?? order.total_price ?? order.total ?? order.amount ?? order.cost;
                const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (Number(rawPrice) || 0);

                const bId = order.bookingId || order.booking_id || order.id || "N/A";
                const title = order.movieTitle || order.movie_title || order.title || "Unknown Movie";
                
                const dateVal = order.createdAt || order.date || order.show_date || "Date TBD"; 
                const timeVal = order.time || "";

                return (
                  <div key={bId + "-" + index} className="border border-zinc-800 rounded bg-zinc-950 p-6 flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg text-white uppercase tracking-wide">{title}</p>
                      <p className="text-sm text-zinc-400 mt-1">
                        {formatDate(dateVal)} {timeVal && `· ${timeVal}`}
                      </p>
                      <div className="flex gap-2 mt-3">
                        {order.seats && order.seats.length > 0 ? (
                          order.seats.map(seat => (
                            <span key={seat} className="text-[10px] bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-white font-bold">
                              {seat}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic">No seats listed</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end justify-center">
                      <span className="text-xl font-bold text-white">
                        ${price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- AI RECOMMENDATIONS SECTION --- */}
        <div>
          <div className="flex items-baseline gap-4 mb-6 border-b border-zinc-800 pb-4">
            <h2 className="text-xl font-bold uppercase tracking-widest text-white">Recommended For You</h2>
            {aiSource && <span className="text-[10px] text-zinc-500 uppercase tracking-widest border border-zinc-700 px-2 py-0.5 rounded">Powered by {aiSource}</span>}
          </div>

          {loadingAi ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-48 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />)}
            </div>
          ) : aiError ? (
            <p className="text-xs text-red-400 uppercase tracking-widest bg-red-950/20 border border-red-900/60 p-4 rounded">
              {aiError}
            </p>
          ) : recommendations.length === 0 ? (
             <div className="border border-zinc-800 rounded bg-zinc-950 p-8 text-center text-zinc-500 text-sm uppercase tracking-widest">
               Watch more movies to get AI recommendations!
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendations.map((rec, i) => (
                <Link 
                  key={i} 
                  href={`/?q=${encodeURIComponent(rec.title)}`}
                  className="border border-zinc-800 hover:border-red-600 transition rounded bg-zinc-950 p-6 flex flex-col h-full group"
                >
                  <h3 className="font-bold text-white uppercase tracking-wide mb-1 group-hover:text-red-500 transition">{rec.title}</h3>
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-3">{rec.genre}</span>
                  
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6 border-t border-zinc-800 pt-3">
                    <span className="text-zinc-600 font-bold mr-1">Why:</span> {rec.reason}
                  </p>
                  
                  <div className="mt-auto pt-2 text-[10px] font-bold text-zinc-500 group-hover:text-white uppercase tracking-widest transition flex items-center gap-2">
                    View Showtimes & Book <span className="text-red-600">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ProfileHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500 uppercase tracking-widest text-xs animate-pulse">Loading Profile...</p>
      </div>
    }>
      <HistoryContent />
    </Suspense>
  );
}