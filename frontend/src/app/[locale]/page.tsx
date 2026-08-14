'use client';

import { useRouter } from '@/i18n/routing';

export default function Home() {
  const router = useRouter();
  router.push('/dashboard');
  return null;
}
