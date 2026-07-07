import { redirect } from 'next/navigation';

// /admin has no content of its own — send people to the dashboard.
export default function AdminIndex() {
  redirect('/admin/dashboard');
}
