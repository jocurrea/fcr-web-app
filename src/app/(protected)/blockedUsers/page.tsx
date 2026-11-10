"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Ban, Check, X, ShieldAlert } from "lucide-react";
import { fetchBlockedUsers, unblockUser } from "@/lib/api/chat";

export default function BlockedUsersPage() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await fetchBlockedUsers();
      setBlockedUsers(list);
    } catch (err) {
      console.error("Error loading blocked users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUnblock = async (userId: string, name: string) => {
    setUnblockingId(userId);
    try {
      const res = await unblockUser(userId);
      if (res.success) {
        showToast(`${name} has been unblocked.`);
        setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        alert(res.error || "Failed to unblock user");
      }
    } catch (e: any) {
      alert(e?.message || "Failed to unblock user");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa] items-center py-6 px-4">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 bg-emerald-600 text-white animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col w-full max-w-md flex-1">
        {/* Header */}
        <div className="w-full relative flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white border border-gray-200 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 stroke-[2.5]" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 mx-auto pr-10">
            Blocked Users
          </h1>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-gray-400">Loading blocked users...</p>
          </div>
        ) : blockedUsers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center flex-1 my-auto text-center py-20">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <Ban className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No blocked users</p>
            <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
              When you block a user from message requests or profile settings, they will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 shadow-xs overflow-hidden">
            {blockedUsers.map((u) => (
              <div
                key={u.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition"
              >
                <Link href={`/profile/${u.id}`} className="flex items-center gap-3 min-w-0 group cursor-pointer">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          u.name
                        )}`;
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition truncate">
                      {u.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 capitalize truncate">
                      {u.role?.replace(/_/g, " ") || "Member"}
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  disabled={unblockingId === u.id}
                  onClick={() => handleUnblock(u.id, u.name)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer shrink-0"
                >
                  {unblockingId === u.id ? "Unblocking..." : "Unblock"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
