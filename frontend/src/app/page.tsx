import { redirect } from 'next/navigation';

// "/" has no content of its own.
export default function Home() {
  redirect('/dashboard');
}
