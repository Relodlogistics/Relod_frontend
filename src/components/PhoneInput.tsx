'use client';

function digitsOnly(value: string) {
  let digits = value.replace(/\D/g, '');
  // Autofill can hand back the full stored value including the country
  // code (e.g. "+918977445625") — strip a leading "91" before truncating
  // so we keep the actual number instead of chopping its tail off.
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[input:disabled]:pointer-events-none has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-input/50 has-[input:disabled]:opacity-50 dark:bg-input/30">
      <span className="flex h-full shrink-0 items-center gap-1 border-r border-input px-2.5 text-base text-muted-foreground select-none md:text-sm">
        <span aria-hidden="true">🇮🇳</span>
        +91
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 py-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"
      />
    </div>
  );
}
