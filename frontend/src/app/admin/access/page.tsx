"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "pending" | "approved";

interface User {
  id: string | number;
  email: string;
  name: string;
  role: string;
  accessApproved?: boolean;
}

interface AccessApprovalMeta {
  note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  updated_at?: string | null;
}

interface AccessRequest {
  id: string | number;
  email: string;
  name: string;
  role: string;
  raw_role?: string;
  accountStatus?: "approved" | "pending" | "disabled" | string;
  created_at?: string | null;
  accessApproved: boolean;
  accessPending: boolean;
  accessDisabled?: boolean;
  approval?: AccessApprovalMeta | null;
}

interface AccessResponse {
  total: number;
  pending: number;
  approved: number;
  requests: AccessRequest[];
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminAccessPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [data, setData] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const sortedRequests = useMemo(() => {
    if (!data?.requests) return [];
    return [...data.requests].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [data]);

  const fetchAccessRequests = async (authToken: string, filter: StatusFilter) => {
    setError(null);
    const response = await fetch(`/api/admin/access-requests?status=${filter}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || "Failed to load access requests");
    }
    const payload: AccessResponse = await response.json();
    setData(payload);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const savedToken = localStorage.getItem("token");
        if (!savedToken) {
          setError("Admin authentication required.");
          setLoading(false);
          return;
        }
        setToken(savedToken);

        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (!meRes.ok) {
          throw new Error("Session expired. Please sign in again.");
        }
        const mePayload = await meRes.json();
        const currentUser = mePayload?.user as User;
        setUser(currentUser);

        if (currentUser?.role !== "admin") {
          setError("Admin access required.");
          setLoading(false);
          return;
        }

        await fetchAccessRequests(savedToken, statusFilter);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize admin page.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!token || !isAdmin) return;
    fetchAccessRequests(token, statusFilter).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to refresh access requests.");
    });
  }, [statusFilter, token, isAdmin]);

  const handleApproval = async (request: AccessRequest, approved: boolean) => {
    if (!token) return;
    setActioningId(String(request.id));
    setError(null);

    try {
      const note = (noteDrafts[String(request.id)] || "").trim();
      const response = await fetch(`/api/admin/access-requests/${request.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approved,
          note: note || (approved ? "Approved via admin panel" : "Set to pending via admin panel"),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to update approval state");
      }

      await fetchAccessRequests(token, statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update approval.");
    } finally {
      setActioningId(null);
    }
  };

  const handleRemoveUser = async (request: AccessRequest) => {
    if (!token) return;
    if (!window.confirm(`Remove account for ${request.email}? This cannot be undone.`)) return;
    setActioningId(String(request.id));
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${request.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to remove user");
      }
      await fetchAccessRequests(token, statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove user.");
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-6">Loading admin console...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card p-6">
            <h1 className="text-xl font-semibold mb-2">Restricted</h1>
            <p className="text-slate-600 mb-4">{error || "Admin access required."}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Admin Access Console</h1>
              <p className="text-slate-600 mt-1">
                Approve pending users and remove abusive or invalid accounts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => token && fetchAccessRequests(token, statusFilter)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100"
              >
                Refresh
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                Home
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <label className="text-sm text-slate-700 font-medium">Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-slate-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="all">All</option>
            </select>
            <span className="text-sm text-slate-600">
              Total: {data?.total ?? 0} | Pending: {data?.pending ?? 0} | Approved: {data?.approved ?? 0}
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {sortedRequests.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-slate-600 text-sm">
              No users found for this filter.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRequests.map((request) => {
                const idKey = String(request.id);
                const inFlight = actioningId === idKey;
                const approved = request.accessApproved;
                const isAdminRow = request.role === "admin";

                return (
                  <div key={idKey} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <p className="font-semibold">{request.name || "Unnamed user"}</p>
                        <p className="text-sm text-slate-600">{request.email}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Role: {request.role} | Created: {formatDate(request.created_at)}
                        </p>
                        <p className="text-xs mt-1">
                          Status:{" "}
                          <span className={approved ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                            {approved ? "Approved" : "Pending"}
                          </span>
                        </p>
                        {request.approval?.reviewed_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            Last reviewed: {formatDate(request.approval.reviewed_at)}
                          </p>
                        )}
                      </div>

                      <div className="md:w-[420px] space-y-3">
                        <textarea
                          value={noteDrafts[idKey] ?? request.approval?.note ?? ""}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({
                              ...prev,
                              [idKey]: e.target.value,
                            }))
                          }
                          rows={3}
                          className="w-full border border-slate-200 rounded-lg p-3 bg-white text-sm"
                          placeholder="Reviewer note (optional)"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={inFlight || approved || isAdminRow}
                            onClick={() => handleApproval(request, true)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {inFlight ? "Saving..." : "Approve"}
                          </button>
                          <button
                            disabled={inFlight || !approved || isAdminRow}
                            onClick={() => handleApproval(request, false)}
                            className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                          >
                            {inFlight ? "Saving..." : "Set Pending"}
                          </button>
                          <button
                            disabled={inFlight || isAdminRow}
                            onClick={() => handleRemoveUser(request)}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {inFlight ? "Working..." : "Remove User"}
                          </button>
                        </div>
                        {isAdminRow && <p className="text-xs text-slate-500">Admin accounts are protected.</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
