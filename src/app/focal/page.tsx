import { redirect } from 'next/navigation';

// /focal has no content of its own — send people to the dashboard.
export default function FocalIndex() {
  redirect('/focal/dashboard');
}
