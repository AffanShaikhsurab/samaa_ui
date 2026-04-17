"use client";

/**
 * app/settings/page.tsx
 *
 * Phase E + F: Settings Page
 *
 * Sections:
 *  1. LLM Provider selection (with model names and docs links)
 *  2. API Key management (secure HTTP-only cookie via /api/api-key)
 *  3. Feature Flags panel (dev-mode only — shows DEPLOYMENT_V1, TEMPLATES_V1, STARTER_PROMPTS_V1)
 *  4. Security info (how keys are stored)
 *
 * The API key is NEVER rendered back to the browser.
 * Status shows: "global env key" | "user key (cookie)" | "not set"
 */

import { useEffect, useState } from "react";
import Link from "next/link";

type Provider = "openai" | "anthropic" | "groq" | "nvidia";

type ApiKeyStatus = {
  hasGlobalKey: boolean;
  hasUserKey: boolean;
  provider: Provider;
};

const PROVIDERS: Array<{ id: Provider; label: string; model: string; docs: string; color: string }> = [
  {
    id: "openai",
    label: "OpenAI",
    model: "gpt-5.2-codex",
    docs: "https://platform.openai.com/api-keys",
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    model: "claude-sonnet-4",
    docs: "https://console.anthropic.com/settings/keys",
    color: "border-orange-200 bg-orange-50 text-orange-700",
  },
  {
    id: "groq",
    label: "Groq",
    model: "llama-3.3-70b-versatile",
    docs: "https://console.groq.com/keys",
    color: "border-purple-200 bg-purple-50 text-purple-700",
  },
  {
    id: "nvidia",
    label: "NVIDIA",
    model: "meta/llama-3.3-70b-instruct",
    docs: "https://ngc.nvidia.com/setup/api-key",
    color: "border-green-200 bg-green-50 text-green-700",
  },
];

// Feature flags shown in dev mode
const FEATURE_FLAGS = [
  { key: "DEPLOYMENT_V1", label: "Deployment (Phase E)", description: "One-click deploy to Vercel" },
  { key: "TEMPLATES_V1", label: "Templates Gallery (Phase F)", description: "Curated template gallery" },
  { key: "STARTER_PROMPTS_V1", label: "Guided Starters (Phase F)", description: "Business-intent starter packs" },
  { key: "CONTROL_PLANE_V2", label: "Control Plane V2", description: "Enhanced build queue + lease heartbeat" },
];

export default function SettingsPage() {
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const isDev = process.env.NODE_ENV === "development";

  const loadStatus = async () => {
    const response = await fetch("/api/api-key", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as ApiKeyStatus;
    setStatus(payload);
    setProvider(payload.provider);
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save API key.");
      setApiKey("");
      setShowKey(false);
      setMessage("✓ API key saved securely.");
      await loadStatus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save API key.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remove your API key? You will not be able to build until a new key is provided.")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      if (!response.ok) throw new Error("Failed to remove API key.");
      setMessage("API key removed.");
      await loadStatus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to remove API key.");
    } finally {
      setSaving(false);
    }
  };

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);
  const keySource = status?.hasGlobalKey
    ? "Global environment key"
    : status?.hasUserKey
      ? "Your personal key (cookie)"
      : "Not configured";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/20">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 md:px-10">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500">Settings</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Model & API Key</h1>
            <p className="mt-1 text-sm text-slate-500">
              Keys are stored in secure HTTP-only cookies and never returned to the browser.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="space-y-6">
          {/* ── Provider Selection ──────────────────────────────────────── */}
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-900 mb-1">LLM Provider</p>
            <p className="text-xs text-slate-500 mb-4">
              Choose which AI model powers your app generation. All providers support streaming.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    provider === p.id
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.01]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold ${provider === p.id ? "text-white" : "text-slate-900"}`}>
                      {p.label}
                    </p>
                    {provider === p.id && (
                      <span className="size-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 font-mono ${provider === p.id ? "text-slate-300" : "text-slate-500"}`}>
                    {p.model}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* ── API Key ─────────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-900">API Key</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current source: <span className="font-semibold text-slate-700">{keySource}</span>
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                status?.hasGlobalKey || status?.hasUserKey
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}>
                {status?.hasGlobalKey || status?.hasUserKey ? "Configured" : "Not set"}
              </span>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter ${selectedProvider?.label ?? "provider"} API key…`}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-12 text-sm font-mono outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
                onKeyDown={(e) => { if (e.key === "Enter" && apiKey.trim()) void save(); }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !apiKey.trim()}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save key"}
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={saving}
                className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                Remove key
              </button>
              {selectedProvider && (
                <a
                  href={selectedProvider.docs}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Get key ↗
                </a>
              )}
            </div>

            {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </section>

          {/* ── Security Info ────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-black/5 bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Security</p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">✓</span> API keys stored in HTTP-only cookies — never accessible via JavaScript</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">✓</span> Keys are never rendered or returned to the browser after saving</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">✓</span> All API routes require Clerk authentication (session token verified server-side)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">✓</span> Deploy requests verified with session token + HMAC signature</li>
            </ul>
          </section>

          {/* ── Feature Flags (dev only) ─────────────────────────────────── */}
          {isDev && (
            <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Feature Flags <span className="ml-1 text-[10px] text-slate-300">(development only)</span>
              </p>
              <div className="space-y-2">
                {FEATURE_FLAGS.map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{flag.label}</p>
                      <p className="text-[11px] text-slate-500">{flag.description}</p>
                    </div>
                    <code className="text-[10px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600">
                      {flag.key}=true
                    </code>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Set these in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env.local</code> to enable features.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
