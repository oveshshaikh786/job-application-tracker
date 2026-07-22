import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const metadata = { title: "Sign in — Job Tracker" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth().catch(() => null);
  const { callbackUrl } = await searchParams;

  if (session?.user) {
    redirect(callbackUrl ?? "/dashboard");
  }

  return (
    <main className="signin-root">
      <style>{`
        .signin-root {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          background: var(--bg);
          padding: 24px;
        }
        .signin-card {
          width: min(420px, 100%);
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-xl);
          padding: 40px 36px;
          display: grid;
          gap: 28px;
          text-align: center;
        }
        .signin-title {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.03em;
          font-family: var(--font-display);
          color: var(--text);
          line-height: 1.1;
          margin: 0;
        }
        .signin-subtitle {
          color: var(--text-2);
          font-size: 14px;
          margin: 6px 0 0;
        }
        .signin-divider {
          height: 1px;
          background: var(--border);
          border-radius: 1px;
        }
        .signin-label {
          color: var(--text-1);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin: 0 0 12px;
        }
        .signin-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 13px 20px;
          border-radius: var(--r-lg);
          border: 1px solid var(--border-2);
          background: var(--glass-lg);
          color: var(--text);
          font-size: 15px;
          font-weight: 700;
          font-family: var(--font);
          cursor: pointer;
          transition: background 160ms ease, border-color 160ms ease, transform 140ms ease;
        }
        .signin-google-btn:hover {
          background: var(--bg-4);
          border-color: var(--border-2);
          transform: translateY(-1px);
        }
        .signin-google-btn:active {
          transform: translateY(0);
        }
        .signin-fine-print {
          color: var(--text-3);
          font-size: 12px;
          margin: 0;
          line-height: 1.5;
        }
      `}</style>

      <div className="signin-card">
        <div>
          <h1 className="signin-title">Job Tracker</h1>
          <p className="signin-subtitle">
            Track applications, follow-ups, and your entire pipeline.
          </p>
        </div>

        <div className="signin-divider" />

        <div>
          <p className="signin-label">Sign in to continue</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", {
                redirectTo: callbackUrl ?? "/dashboard",
              });
            }}
          >
            <button type="submit" className="signin-google-btn">
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        </div>

        <p className="signin-fine-print">
          Your data is private and only visible to you.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
