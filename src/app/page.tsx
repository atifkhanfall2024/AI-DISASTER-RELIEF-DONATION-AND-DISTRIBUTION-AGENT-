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
    <div className="bg-[#F8F9FA] dark:bg-[#0B1120] min-h-screen font-sans selection:bg-brand-teal/30">
      <Navbar />

      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl pt-32 pb-40 px-6 border-b border-white/20 dark:border-slate-800/50">
        {/* Animated Background Blobs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-brand-teal/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob dark:mix-blend-screen"></div>
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-brand-blue/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob dark:mix-blend-screen" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-brand-amber/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob dark:mix-blend-screen" style={{ animationDelay: '4s' }}></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.1] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Connecting Relief <br className="hidden md:block" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal via-brand-blue to-brand-amber">Where It&apos;s Needed Most</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            A transparent, fast, and need-based platform ensuring your help reaches the right hands with the power of artificial intelligence.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/donate"
              className="group relative bg-brand-teal text-white px-8 py-4 rounded-full font-semibold hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(15,110,86,0.3)] hover:shadow-[0_0_30px_rgba(15,110,86,0.6)] text-base flex items-center justify-center gap-3"
            >
              <iconify-icon icon="solar:heart-bold" class="text-xl group-hover:animate-pulse"></iconify-icon>
              I Want to Help
            </Link>
            <Link
              href="/focal/submit"
              className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-8 py-4 rounded-full font-semibold hover:bg-white dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg text-base flex items-center justify-center gap-3"
            >
              <iconify-icon icon="solar:document-add-bold-duotone" class="text-xl text-brand-blue"></iconify-icon>
              Submit Ground Report
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS SECTION (Glassmorphism overlap) ───────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-20 mb-24 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200/50 dark:divide-slate-700/50">
          <div className="pt-4 md:pt-0 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 bg-brand-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <iconify-icon icon="solar:verified-check-bold-duotone" class="text-2xl text-brand-teal"></iconify-icon>
            </div>
            <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">{stats.totalRequests}</div>
            <div className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-xs">Verified Requests</div>
          </div>
          <div className="pt-4 md:pt-0 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <iconify-icon icon="solar:users-group-two-rounded-bold-duotone" class="text-2xl text-brand-blue"></iconify-icon>
            </div>
            <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">{stats.families.toLocaleString()}</div>
            <div className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-xs">Families Reached</div>
          </div>
          <div className="pt-4 md:pt-0 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 bg-brand-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <iconify-icon icon="solar:wallet-money-bold-duotone" class="text-2xl text-brand-amber"></iconify-icon>
            </div>
            <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              <span className="text-2xl text-slate-400 mr-1">Rs.</span>
              {stats.donations.toLocaleString()}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-xs">Donations Delivered</div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12 mb-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">How ReliefAid Works</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Our AI-driven process ensures absolute transparency and speed from the moment a disaster strikes to the delivery of aid.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-[40%] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent -z-10"></div>
          
          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-blue/20 to-brand-blue/5 border border-brand-blue/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <iconify-icon icon="solar:map-point-bold-duotone" class="text-3xl text-brand-blue"></iconify-icon>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Ground Report</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Volunteers submit on-ground needs with live location and photographic evidence.
            </p>
          </div>
          
          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-teal to-brand-amber rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-amber/20 to-brand-amber/5 border border-brand-amber/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <iconify-icon icon="solar:magic-stick-3-bold-duotone" class="text-3xl text-brand-amber"></iconify-icon>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. AI Verification</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Gemini AI analyzes the data, flags duplicates, and computes a Relief Priority Index (RPI).
              </p>
            </div>
          </div>
          
          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-teal/20 to-brand-teal/5 border border-brand-teal/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <iconify-icon icon="solar:box-minimalistic-bold-duotone" class="text-3xl text-brand-teal"></iconify-icon>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Transparent Aid</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Donors fund verified needs directly, and distributions are logged with CNIC checks.
            </p>
          </div>
        </div>
      </div>

      {/* ── URGENT NEEDS ──────────────────────────────────────────────────────── */}
      <div className="bg-white/50 dark:bg-slate-900/50 py-24 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-brand-rust font-semibold mb-2">
                <iconify-icon icon="solar:danger-triangle-bold"></iconify-icon>
                High Priority
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Urgent Needs Today</h2>
            </div>
            <Link 
              href="/donate" 
              className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              View All Campaigns
              <iconify-icon icon="solar:arrow-right-linear" class="group-hover:translate-x-1 transition-transform"></iconify-icon>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {urgent.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600">
                <iconify-icon icon="solar:smile-circle-linear" class="text-4xl mb-3 opacity-50"></iconify-icon>
                <p>No highly urgent requests at the moment. Check back later.</p>
              </div>
            )}
            {urgent.map((r: any) => (
              <div
                key={r._id}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col"
              >
                <div className="h-48 relative overflow-hidden">
                  <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  {/* If there was an image, we'd put it here. For now, gradient placeholder */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-slate-900/90 group-hover:scale-105 transition-transform duration-700"></div>
                  
                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className="bg-brand-rust/90 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 uppercase tracking-wide flex items-center gap-1 shadow-lg">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      {r.urgency}
                    </span>
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="font-bold text-xl flex items-center gap-2 drop-shadow-md">
                      <iconify-icon icon="solar:map-point-bold"></iconify-icon> {r.area}
                    </div>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm mb-5 pb-5 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 font-medium">
                      <iconify-icon icon="solar:users-group-two-rounded-bold" class="text-brand-blue text-lg"></iconify-icon> 
                      {r.familiesAffected} Families
                    </div>
                    <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    <div className="flex items-center gap-1.5 font-medium capitalize">
                      <iconify-icon icon="solar:cloud-water-bold" class="text-brand-teal text-lg"></iconify-icon>
                      {r.disasterType || 'Disaster'}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    {r.items.slice(0, 3).map((item: string) => (
                      <span key={item} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-600">
                        {item}
                      </span>
                    ))}
                    {r.items.length > 3 && (
                      <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-full text-xs font-medium">
                        +{r.items.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <Link
                    href={`/donate/${r._id}`}
                    className="w-full text-center bg-brand-teal/10 hover:bg-brand-teal text-brand-teal hover:text-white border border-brand-teal/20 py-3 rounded-xl font-semibold transition-all duration-300"
                  >
                    View Details & Donate
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex justify-center items-center gap-2 text-brand-teal font-bold text-2xl tracking-tight mb-6">
            <iconify-icon icon="solar:hand-heart-bold" class="text-3xl"></iconify-icon>
            ReliefAid
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto text-lg">
            Transparency and speed when it matters most. Building a resilient future together.
          </p>
          <div className="flex justify-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <a href="#" className="hover:text-brand-teal transition">About</a>
            <a href="#" className="hover:text-brand-teal transition">NGO Partners</a>
            <a href="#" className="hover:text-brand-teal transition">Privacy Policy</a>
          </div>
          <div className="mt-12 text-slate-400 text-xs">
            © {new Date().getFullYear()} ReliefAid. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
