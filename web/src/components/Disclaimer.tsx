export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-center text-xs leading-relaxed text-on-surface-variant ${className}`}
    >
      Preventive insight only — not a medical diagnosis. Always consult a
      qualified healthcare professional.
    </p>
  );
}
