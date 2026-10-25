import { useAudio } from '@/context/AudioContext';

export default function MiniPlayerProgress() {
  const { progress } = useAudio();

  return (
    <div className="absolute inset-0 w-full h-full">
      <div className="h-full bg-ink/10" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}