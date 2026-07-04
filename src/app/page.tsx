import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';

export const dynamic = 'force-dynamic';

async function getStats() {
  const db = await connectDB();
  if (!db) {
    return { totalRequests: 0, families: 0, donations: 0 };
  }

  try {
    const [totalRequests, familiesAgg, donationAgg] = await Promise.all([
      ReliefRequest.countDocuments({ status: { $in: ['approved', 'fulfilled'] } }),
      ReliefRequest.aggregate([
        { $match: { status: { $in: ['approved', 'fulfilled'] } } },
        { $group: { _id: null, total: { $sum: '$familiesAffected' } } }
      ]),
      ReliefRequest.aggregate([{ $group: { _id: null, total: { $sum: '$donationRaised' } } }])
    ]);
    return {
      totalRequests,
      families: familiesAgg[0]?.total || 0,
      donations: donationAgg[0]?.total || 0
    };
  } catch {
    return { totalRequests: 0, families: 0, donations: 0 };
  }
}

async function getUrgent() {
  const db = await connectDB();
  if (!db) {
    return [] as any[];
  }

  try {
    return ReliefRequest.find({ status: { $in: ['needs_approval', 'approved'] } })
      .sort({ urgency: -1, createdAt: -1 })
      .limit(6)
      .lean();
  } catch {
    return [] as any[];
  }
}

export default async function LandingPage() {
  const [stats, urgent] = await Promise.all([getStats(), getUrgent()]);

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen">
      <Navbar />

      <div className="bg-gradient-to-br from-brand-blue/5 to-brand-teal/5 py-24 px-6 border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 mb-6 leading-tight">
            Connecting Relief <br className="hidden md:block" /> Where It&apos;s Needed Most
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI-powered flood relief donation and distribution — transparent, fast, and need-based. Ensure your
            help reaches the right hands.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/donate"
              className="bg-brand-teal text-white px-6 py-3.5 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm text-base flex items-center justify-center gap-2"
            >
              <iconify-icon icon="solar:heart-linear" class="text-lg"></iconify-icon>
              I Want to Help (Donate)
            </Link>
            <Link
              href="/focal/submit"
              className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-medium hover:bg-slate-50 transition shadow-sm text-base flex items-center justify-center gap-2"
            >
              <iconify-icon icon="solar:document-add-linear" class="text-lg"></iconify-icon>
              Submit a Relief Request
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-10 mb-20">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="pt-4 md:pt-0">
            <div className="text-4xl font-semibold text-brand-teal tracking-tight mb-1">{stats.totalRequests}</div>
            <div className="text-slate-500 font-medium">Requests Verified</div>
          </div>
          <div className="pt-4 md:pt-0">
            <div className="text-4xl font-semibold text-brand-blue tracking-tight mb-1">{stats.families.toLocaleString()}</div>
            <div className="text-slate-500 font-medium">Families Helped</div>
          </div>
          <div className="pt-4 md:pt-0">
            <div className="text-4xl font-semibold text-brand-amber tracking-tight mb-1">Rs. {stats.donations.toLocaleString()}</div>
            <div className="text-slate-500 font-medium">Donations Delivered</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-12 text-center">How FloodAid Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-1/4 left-[16%] right-[16%] h-[1px] bg-slate-200 -z-10"></div>
          <div className="text-center bg-white dark:bg-slate-900">
            <div className="w-16 h-16 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <iconify-icon icon="solar:map-point-linear" class="text-2xl text-brand-blue"></iconify-icon>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">1. Request Submitted</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Focal persons or volunteers submit ground reports with location and photographic evidence.
            </p>
          </div>
          <div className="text-center bg-white dark:bg-slate-900">
            <div className="w-16 h-16 border border-brand-amber/20 bg-brand-amber/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm relative">
              <iconify-icon icon="solar:magic-stick-3-linear" class="text-2xl text-brand-amber"></iconify-icon>
              <span className="absolute -top-2 -right-2 bg-brand-amber text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">AI</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">2. AI Verification</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Our AI analyzes images, detects duplicates, and assigns an urgency score to prioritize needs.
            </p>
          </div>
          <div className="text-center bg-white dark:bg-slate-900">
            <div className="w-16 h-16 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <iconify-icon icon="solar:box-minimalistic-linear" class="text-2xl text-brand-teal"></iconify-icon>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">3. Transparent Relief</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Donors directly fund verified requests, and distribution logs ensure complete transparency.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 py-20 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">Urgent Needs Today</h2>
              <p className="text-slate-500">Verified areas requiring immediate assistance.</p>
            </div>
            <Link href="/donate" className="text-brand-blue font-medium hover:text-brand-blue/80 flex items-center gap-1 transition">
              View All <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
            </Link>
          </div>

          <div className="flex overflow-x-auto hide-scroll gap-6 pb-6">
            {urgent.length === 0 && (
              <p className="text-slate-500">No verified requests yet — check back soon.</p>
            )}
            {urgent.map((r: any) => (
              <div
                key={r._id}
                className="min-w-[320px] max-w-[320px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex-shrink-0"
              >
                <div className="h-32 bg-slate-100 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <span className="absolute top-3 right-3 bg-brand-rust/90 text-white text-[10px] font-semibold px-2 py-1 rounded-md backdrop-blur-sm border border-white/20 uppercase tracking-wider flex items-center gap-1">
                    {r.urgency}
                  </span>
                  <div className="absolute bottom-3 left-3 text-white">
                    <div className="font-medium flex items-center gap-1 text-base">
                      <iconify-icon icon="solar:map-point-linear"></iconify-icon> {r.area}
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                    <iconify-icon icon="solar:users-group-two-rounded-linear"></iconify-icon> {r.familiesAffected} Families Affected
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {r.items.slice(0, 3).map((item: string) => (
                      <span key={item} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/donate/${r._id}`}
                    className="w-full block text-center bg-brand-teal text-white py-2.5 rounded-lg font-medium hover:bg-brand-teal/90 transition"
                  >
                    Donate Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 py-12 text-center">
        <div className="flex justify-center items-center gap-2 text-brand-teal font-semibold text-lg tracking-tight mb-4">
          <iconify-icon icon="solar:drop-bold" class="text-2xl"></iconify-icon>
          FloodAid
        </div>
        <p className="text-slate-500 mb-6">Transparency and speed when it matters most.</p>
        <div className="flex justify-center gap-6 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-slate-900">About</a>
          <a href="#" className="hover:text-slate-900">NGO Partners</a>
          <a href="#" className="hover:text-slate-900">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}
