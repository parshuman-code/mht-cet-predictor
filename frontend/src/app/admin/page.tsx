"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Search, ShieldAlert, CheckCircle, XCircle, Users } from "lucide-react";

type UserData = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: number;
  lastSignInAt: number | null;
  isAllowed: boolean;
};

export default function AdminPage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const isAdmin = user?.emailAddresses[0]?.emailAddress === "prashantgadwe142006@gmail.com";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      if (!user) {
        router.push("/");
      } else if (!isAdmin) {
        // Not admin, redirect to home
        router.push("/");
      } else {
        // Fetch users
        const timer = setTimeout(() => {
          fetchUsers();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoaded, user, isAdmin, router]);

  const toggleAccess = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setUsers(users.map(u => u.id === userId ? { ...u, isAllowed: newStatus } : u));
    
    try {
      const res = await fetch("/api/users/toggle-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAllowed: newStatus })
      });
      if (!res.ok) {
        throw new Error("Failed to update access");
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setUsers(users.map(u => u.id === userId ? { ...u, isAllowed: currentStatus } : u));
      alert("Error updating user access.");
    }
  };

  if (!isLoaded || !user || !isAdmin) {
    return <div className="min-h-screen bg-[#050510] flex items-center justify-center text-indigo-400">Loading...</div>;
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#050510] text-slate-300 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <ShieldAlert className="text-indigo-500 h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Manage user access for ClgPredict</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full md:w-80 transition-all text-sm"
            />
          </div>
        </header>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              Registered Users
            </h2>
            <span className="bg-indigo-500/20 text-indigo-300 py-1 px-3 rounded-full text-xs font-bold border border-indigo-500/30">
              Total: {users.length}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="p-5 font-bold">User</th>
                  <th className="p-5 font-bold">Joined</th>
                  <th className="p-5 font-bold">Last Login</th>
                  <th className="p-5 font-bold text-center">Access Status</th>
                  <th className="p-5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">Loading users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{u.email}</span>
                          {(u.firstName || u.lastName) && (
                            <span className="text-xs text-slate-500 mt-1">{u.firstName} {u.lastName}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-5 text-sm text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-5 text-sm text-slate-400">
                        {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="p-5 text-center">
                        {u.isAllowed ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 py-1.5 px-3 rounded-full text-xs font-bold border border-emerald-500/20">
                            <CheckCircle className="h-3.5 w-3.5" /> Allowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 py-1.5 px-3 rounded-full text-xs font-bold border border-rose-500/20">
                            <XCircle className="h-3.5 w-3.5" /> Blocked
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        <button
                          onClick={() => toggleAccess(u.id, u.isAllowed)}
                          className={`text-xs font-bold py-2 px-4 rounded-lg transition-all tracking-wide ${
                            u.isAllowed 
                              ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30" 
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                          }`}
                        >
                          {u.isAllowed ? "Revoke Access" : "Grant Access"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
