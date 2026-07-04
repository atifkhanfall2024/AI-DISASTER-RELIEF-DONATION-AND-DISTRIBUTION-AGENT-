'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'emerald-500' },
  { value: 'medium', label: 'Medium', color: '[#BA7517]' },
  { value: 'high', label: 'High', color: 'orange-500' },
  { value: 'critical', label: 'Critical', color: '[#993C1D]' }
];

const DISASTER_TYPES = [
  { value: 'flood', label: 'Flood', emoji: '🌊' },
  { value: 'earthquake', label: 'Earthquake', emoji: '🏚️' },
  { value: 'landslide', label: 'Landslide', emoji: '⛰️' },
  { value: 'storm', label: 'Storm / Cyclone', emoji: '🌪️' },
  { value: 'drought', label: 'Drought', emoji: '☀️' },
  { value: 'fire', label: 'Fire', emoji: '🔥' },
  { value: 'epidemic', label: 'Epidemic', emoji: '🦠' },
  { value: 'other', label: 'Other', emoji: '🆘' }
];

const QUICK_ITEMS = ['Clean Water', 'Medicine', 'Clothing', 'Tents', 'Food Rations', 'Blankets'];

export default function SubmitRequestPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [area, setArea] = useState('');
  const [district, setDistrict] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [disasterType, setDisasterType] = useState('flood');
  const [urgency, setUrgency] = useState('high');
  const [families, setFamilies] = useState(45);
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [itemInput, setItemInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  function addItem(item: string) {
    const trimmed = item.trim();
    if (trimmed && !items.includes(trimmed)) setItems([...items, trimmed]);
    setItemInput('');
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        setLocationError(err.message || 'Unable to fetch your location.');
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (sessionStatus !== 'authenticated') {
      setError('Please log in as a focal person before submitting a request.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload images (if any) to Supabase Storage
      const imageUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        imageUrls.push(data.url);
      }

      // 2. Create the request (this also triggers Gemini AI analysis server-side)
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area,
          district,
          disasterType,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          urgency,
          familiesAffected: Number(families),
          description,
          items,
          images: imageUrls
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-teal/10 flex items-center justify-center">
          <iconify-icon icon="solar:check-circle-bold" class="text-3xl text-brand-teal"></iconify-icon>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Request submitted</h1>
        <p className="text-slate-500 mb-6">
          Request #{result._id.slice(-6).toUpperCase()} was analyzed by our AI engine with a priority score of{' '}
          <strong>{result.aiScore}/10</strong>. It&apos;s now waiting on admin review.
        </p>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl p-5 text-left mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">AI Reasoning</div>
          <p className="text-sm text-slate-700 leading-relaxed">{result.aiReasoning}</p>
          {result.aiFlags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {result.aiFlags.map((f: string) => (
                <span key={f} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => router.push('/focal/dashboard')}
          className="bg-brand-teal text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
          >
            <iconify-icon icon="solar:arrow-left-linear"></iconify-icon>
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Submit Relief Request</h1>
            <p className="text-slate-500 text-sm">Provide accurate details for faster AI verification.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">1. Location Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Area / Village Name</label>
                <input
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Village XYZ"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">District / Province</label>
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Dadu, Sindh"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-100 transition flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                <iconify-icon icon="solar:map-point-linear" class="text-lg text-brand-blue"></iconify-icon>
                {locating ? 'Locating…' : 'Use My GPS Location'}
              </button>
              {locationError && <p className="text-xs text-red-600">{locationError}</p>}

              <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 border-dashed overflow-hidden relative">
                {lat != null && lng != null ? (
                  <>
                    <iconify-icon icon="solar:map-point-bold" class="text-3xl text-brand-teal relative z-10"></iconify-icon>
                    <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded text-xs font-medium text-slate-700 shadow-sm border border-slate-200">
                      Lat: {lat.toFixed(3)}, Lng: {lng.toFixed(3)}
                    </div>
                  </>
                ) : (
                  <>
                    <iconify-icon icon="solar:map-minimalistic-linear" class="text-3xl text-slate-300"></iconify-icon>
                    <div className="absolute inset-0 bg-slate-50/50 flex items-center justify-center text-xs font-medium text-slate-400">
                      Map Preview Placeholder
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">2. Situation Assessment</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-3">Disaster Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DISASTER_TYPES.map((opt) => (
                    <label key={opt.value} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="disasterType"
                        className="peer sr-only"
                        checked={disasterType === opt.value}
                        onChange={() => setDisasterType(opt.value)}
                      />
                      <div
                        className={`border rounded-xl p-3 flex flex-col items-center text-center transition ${
                          disasterType === opt.value
                            ? 'border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xl mb-1">{opt.emoji}</div>
                        <div className="font-medium text-slate-900 text-xs">{opt.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-3">Urgency Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {URGENCY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="urgency"
                        className="peer sr-only"
                        checked={urgency === opt.value}
                        onChange={() => setUrgency(opt.value)}
                      />
                      <div
                        className={`border rounded-xl p-3 flex flex-col items-center text-center transition ${
                          urgency === opt.value ? 'border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full bg-${opt.color} mb-2`}></div>
                        <div className="font-medium text-slate-900 text-sm">{opt.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Number of Affected Families</label>
                <input
                  type="number"
                  min={1}
                  value={families}
                  onChange={(e) => setFamilies(Number(e.target.value))}
                  className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the situation in detail..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">3. Items Required</h2>
            <div className="border border-slate-300 rounded-lg p-2 bg-white dark:bg-slate-900 flex flex-wrap gap-2 items-center mb-3 focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal transition">
              {items.map((item) => (
                <span key={item} className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
                  {item}
                  <button type="button" onClick={() => setItems(items.filter((i) => i !== item))} className="hover:text-red-500">
                    <iconify-icon icon="solar:close-circle-linear" class="text-sm"></iconify-icon>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem(itemInput);
                  }
                }}
                placeholder="Type item and press Enter..."
                className="flex-1 min-w-[150px] outline-none text-sm bg-transparent py-1 px-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500 mr-1 mt-1">Quick Add:</span>
              {QUICK_ITEMS.map((qi) => (
                <button
                  key={qi}
                  type="button"
                  onClick={() => addItem(qi)}
                  className="text-xs font-medium text-brand-blue bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition border border-blue-100"
                >
                  + {qi}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
              4. Supporting Evidence
              <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Max 3 images</span>
            </h2>
            <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition cursor-pointer mb-4 bg-white dark:bg-slate-900 block">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
              />
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                <iconify-icon icon="solar:camera-add-linear" class="text-2xl"></iconify-icon>
              </div>
              <div className="text-sm font-medium text-slate-700 mb-1">Click to upload or drag &amp; drop</div>
              <div className="text-xs text-slate-500">JPG, PNG (max 5MB each)</div>
            </label>
            {files.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {files.map((f) => (
                  <div key={f.name} className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-teal text-white py-3.5 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm text-base flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? 'Submitting & running AI review…' : 'Submit Request for AI Review'}
            <iconify-icon icon="solar:magic-stick-3-linear" class="text-lg text-brand-amber bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm"></iconify-icon>
          </button>
        </form>
      </div>
    </div>
  );
}
