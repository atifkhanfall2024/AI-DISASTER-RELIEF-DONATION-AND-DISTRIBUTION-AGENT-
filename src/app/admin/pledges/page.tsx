import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ItemPledge from '@/lib/models/ItemPledge';
import Inventory from '@/lib/models/Inventory';
import PledgesClient from './PledgesClient';

export const dynamic = 'force-dynamic';

export default async function AdminPledgesPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super-admin')) {
    redirect('/login');
  }

  await connectDB();
  
  // Fetch all pledges sorted by newest
  const rawPledges = await ItemPledge.find().sort({ createdAt: -1 }).lean();
  const pledges = JSON.parse(JSON.stringify(rawPledges)); // Serialize

  // Fetch all inventory items for mapping
  const rawInventory = await Inventory.find().lean();
  const inventoryItems = JSON.parse(JSON.stringify(rawInventory)); // Serialize

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <iconify-icon icon="solar:box-minimalistic-bold-duotone" class="text-brand-blue"></iconify-icon>
            In-Kind Pledges
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review and verify physical items donated by the public. Map them to your central inventory upon receipt.
          </p>
        </div>
      </div>

      <PledgesClient pledges={pledges} inventoryItems={inventoryItems} />
    </div>
  );
}
