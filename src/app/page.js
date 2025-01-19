'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleNavigation = () => {
    router.push('/om');
  };

  return (
    <div
      className='size-10 bg-slate-200 cursor-pointer'
      onClick={handleNavigation}
    >
      Klik her for at gå til Om-siden
    </div>
  );
}