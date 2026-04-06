"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adsAdminApi } from "@/lib/client-api";
import type { Advertiser } from "@repo/types";

export default function AdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // New advertiser form
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await adsAdminApi.listAdvertisers() as { data: { data: Advertiser[] } };
    setAdvertisers(res.data.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await adsAdminApi.createAdvertiser({ name, contactName, email, phone, website, notes });
      setName(""); setContactName(""); setEmail(""); setPhone(""); setWebsite(""); setNotes("");
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/ads" className="text-sm text-neutral-400 hover:text-accent">← Ads</Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Advertisers</h1>
          <p className="text-sm text-neutral-500 mt-1">{advertisers.length} advertiser{advertisers.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Advertiser
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-neutral-100 dark:border-neutral-800 p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">New Advertiser</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Company Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Telekom MK" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Contact Person</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="ads@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+389 …" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Website</label>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://company.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Internal Notes</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Contract details, contacts, etc." />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-60">
              {creating ? "Creating…" : "Create Advertiser"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-neutral-400">Loading…</div>
      ) : (
        <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Company</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Contact</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-500">Ads</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-500">Campaigns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {advertisers.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-neutral-400">No advertisers yet.</td></tr>
              )}
              {advertisers.map((adv) => (
                <tr key={adv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{adv.name}</div>
                    {adv.website && <a href={adv.website} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">{adv.website}</a>}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    <div>{adv.contactName}</div>
                    <div>{adv.email}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400">
                    {adv._count?.ads ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400">
                    {adv._count?.campaigns ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
