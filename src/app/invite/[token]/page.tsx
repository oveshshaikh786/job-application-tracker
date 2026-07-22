"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type InviteInfo = {
  workspaceName: string;
  email?: string;
  expiresAt: string;
};

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [state, setState] = useState<
    "loading" | "preview" | "joining" | "done" | "error"
  >("loading");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/workspace/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setState("error");
        } else {
          setInfo(data);
          setState("preview");
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load invite.");
        setState("error");
      });
  }, [token]);

  async function handleAccept() {
    setState("joining");
    try {
      const res = await fetch(`/api/workspace/invite/${token}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.status === 401) {
        // Not signed in — send to sign-in then back here
        router.push(`/sign-in?callbackUrl=/invite/${token}`);
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to join workspace.");
        setState("error");
        return;
      }
      setState("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-logo">J</div>
        <p className="invite-eyebrow">Workspace Invite</p>

        {state === "loading" && (
          <p className="invite-body">Checking invite link…</p>
        )}

        {state === "preview" && info && (
          <>
            <h1 className="invite-title">
              Join <strong>{info.workspaceName}</strong>
            </h1>
            {info.email && (
              <p className="invite-body">
                This invite is for <strong>{info.email}</strong>
              </p>
            )}
            <p className="invite-expires">
              Expires {new Date(info.expiresAt).toLocaleDateString()}
            </p>
            <button className="btn btn-primary invite-cta" onClick={handleAccept}>
              Accept &amp; join workspace
            </button>
          </>
        )}

        {state === "joining" && (
          <p className="invite-body">Joining workspace…</p>
        )}

        {state === "done" && (
          <>
            <h1 className="invite-title">You&apos;re in!</h1>
            <p className="invite-body">Redirecting to your dashboard…</p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="invite-title invite-title--error">Invalid link</h1>
            <p className="invite-body">{errorMsg}</p>
            <a href="/dashboard" className="btn btn-primary invite-cta">
              Go to dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}
