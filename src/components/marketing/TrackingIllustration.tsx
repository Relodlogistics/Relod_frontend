import Image from 'next/image';

export function TrackingIllustration() {
  return (
    <Image
      src="/marketing/hero-illustration.png"
      alt="Relod live tracking preview — a truck on route with a phone showing its live location, ETA and driver contact"
      width={2304}
      height={1844}
      className="h-auto w-full max-w-[560px]"
      priority
    />
  );
}
