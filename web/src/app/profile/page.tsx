import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { ProfileForm } from "@/components/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader backHref="/dashboard" />
      <main className="mx-auto w-full max-w-3xl flex-grow px-4 py-8">
        <h2 className="font-headline text-3xl font-bold">Your Health Profile</h2>
        <p className="mt-2 text-on-surface-variant">
          Answer a few non-sensitive questions. We compare them with NHMS
          national statistics using clear rules.
        </p>
        <div className="mt-8">
          <ProfileForm />
        </div>
        <Disclaimer className="mt-8 pb-8" />
      </main>
    </div>
  );
}
