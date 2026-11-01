"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, { ok: false });
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="password" className="label">סיסמה</label>
      <input id="password" name="password" type="password" className="input" autoFocus required />
      {state.message ? <p className="text-sm text-blush-700">{state.message}</p> : null}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "נכנס…" : "כניסה"}</button>
    </form>
  );
}
