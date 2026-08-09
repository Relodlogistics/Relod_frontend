import Image from 'next/image';

interface AuthBackgroundProps {
  children: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
}

// A split layout for the phone/OTP/login screens — an image panel on the
// left, form content centered on the page. `h-dvh` keeps this to exactly one
// viewport with no scroll. The image and the content are both absolutely
// positioned against the same full-width `<main>` (instead of flex siblings
// splitting the row) so the image panel's width can be widened independently
// without shifting the card off true horizontal center — a flex split would
// re-center the card within just the remaining space, not the page.
export function AuthBackground({ children, imageSrc, imageAlt }: AuthBackgroundProps) {
  return (
    <main className="relative h-dvh overflow-hidden bg-[rgb(244,242,254)]">
      <div className="absolute inset-y-0 left-0 hidden w-[46%] max-w-lg lg:block">
        <Image src={imageSrc} alt={imageAlt} fill sizes="46vw" className="object-cover" priority />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-[rgb(244,242,254)]"
          aria-hidden="true"
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-6">{children}</div>
    </main>
  );
}
