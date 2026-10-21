import { Suspense } from "react";
import { ErrorMessage } from "../../components/lp";
import { signIn } from "./actions";

async function SignInError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  // One generic message for every failure, so the page never reveals whether an account exists.
  return error ? <ErrorMessage title="Sign-in failed." body="Check your email and password, then try again." /> : null;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="auth-page">
      <div className="auth-panel stack">
        <h1 className="page-title">Sign in to MiniDSP</h1>
        <section className="lp-card lp-card--elevated">
          <div className="lp-card__body">
            <form action={signIn} className="stack">
              <Suspense fallback={null}>
                <SignInError searchParams={searchParams} />
              </Suspense>
              <div className="lp-input lp-input--full-width">
                <div className="lp-input__row lp-input__row--label-top">
                  <label className="lp-input__label" htmlFor="email">Email</label>
                  <div className="lp-input__field">
                    <input className="lp-input__input" id="email" name="email" type="email"
                           autoComplete="email" required maxLength={320} />
                  </div>
                </div>
              </div>
              <div className="lp-input lp-input--full-width">
                <div className="lp-input__row lp-input__row--label-top">
                  <label className="lp-input__label" htmlFor="password">Password</label>
                  <div className="lp-input__field">
                    <input className="lp-input__input" id="password" name="password" type="password"
                           autoComplete="current-password" required maxLength={256} />
                  </div>
                </div>
              </div>
              <button type="submit" className="lp-button lp-button--primary lp-button--md lp-button--full-width">
                Sign in
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
