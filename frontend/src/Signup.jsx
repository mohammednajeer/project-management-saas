import { useMemo, useState } from "react";
import { ArrowRight, Check, Eye, Plus, Zap } from "lucide-react";
import "./Auth.css";
import "./Signup.css";

const steps = ["Account", "Workspace", "Invite"];

export default function Signup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [invites, setInvites] = useState([0, 1, 2]);

  const buttonLabel = useMemo(() => {
    if (currentStep === 2) return "Create workspace";
    return "Continue";
  }, [currentStep]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  return (
    <main className="auth-root auth-signup-page">
      <section className="auth-onboarding" aria-label="Create workspace">
        <a href="/" className="auth-brand auth-brand-dark">
          <span className="auth-logo">
            <Zap size={24} />
          </span>
          <span>ProjectFlow</span>
        </a>

        <nav className="auth-stepper" aria-label="Signup steps">
          {steps.map((step, index) => (
            <button
              type="button"
              className={`auth-step ${index < currentStep ? "is-complete" : ""} ${index === currentStep ? "is-active" : ""}`}
              key={step}
              onClick={() => setCurrentStep(index)}
              aria-current={index === currentStep ? "step" : undefined}
            >
              <span className="auth-step-dot">
                {index < currentStep ? <Check size={20} /> : index + 1}
              </span>
              <span className="auth-step-label">{step}</span>
            </button>
          ))}
        </nav>

        <form className="auth-onboarding-card" onSubmit={handleSubmit}>
          {currentStep === 0 && <AccountStep />}
          {currentStep === 1 && <WorkspaceStep />}
          {currentStep === 2 && <InviteStep invites={invites} onAddInvite={() => setInvites((items) => [...items, items.length])} />}

          <button type="submit" className="auth-submit">
            {buttonLabel}
            <ArrowRight size={18} />
          </button>

          {currentStep === 2 && (
            <button type="button" className="auth-skip" onClick={() => setCurrentStep(2)}>
              Skip for now
            </button>
          )}
        </form>

        <p className="auth-footer-note">
          Already have a workspace? <a href="/signin">Sign in</a>
        </p>
      </section>
    </main>
  );
}

function AccountStep() {
  return (
    <>
      <div className="auth-form-head auth-form-head-left">
        <h1>Create your account</h1>
        <p>Start your 14-day free trial, no credit card required.</p>
      </div>

      <label className="auth-field">
        <span className="auth-label">Full name</span>
        <input className="auth-input" type="text" placeholder="John Doe" />
      </label>

      <label className="auth-field">
        <span className="auth-label">Work email</span>
        <input className="auth-input" type="email" placeholder="you@company.com" />
      </label>

      <label className="auth-field">
        <span className="auth-label">Password</span>
        <span className="auth-input-wrap">
          <input className="auth-input auth-input-with-action" type="password" placeholder="Min. 8 characters" />
          <Eye size={18} className="auth-input-action" aria-hidden="true" />
        </span>
        <span className="auth-strength" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
      </label>

      <p className="auth-terms">
        By signing up, you agree to our <a href="/">Terms</a> and <a href="/">Privacy Policy</a>.
      </p>
    </>
  );
}

function WorkspaceStep() {
  return (
    <>
      <div className="auth-form-head auth-form-head-left">
        <h1>Set up your workspace</h1>
        <p>Your workspace is where your team works together.</p>
      </div>

      <label className="auth-field">
        <span className="auth-label">Workspace name</span>
        <input className="auth-input" type="text" placeholder="Acme Corp" />
        <span className="auth-help">This will be your URL: <strong>projectflow.io/acme-corp</strong></span>
      </label>

      <label className="auth-field">
        <span className="auth-label">Team size</span>
        <select className="auth-input" defaultValue="just-me">
          <option value="just-me">Just me</option>
          <option value="2-10">2-10 people</option>
          <option value="11-50">11-50 people</option>
          <option value="51-plus">51+ people</option>
        </select>
      </label>

      <label className="auth-field">
        <span className="auth-label">Industry</span>
        <select className="auth-input" defaultValue="software">
          <option value="software">Software / Technology</option>
          <option value="consulting">Consulting</option>
          <option value="education">Education</option>
          <option value="other">Other</option>
        </select>
      </label>
    </>
  );
}

function InviteStep({ invites, onAddInvite }) {
  return (
    <>
      <div className="auth-form-head auth-form-head-left">
        <h1>Invite your team</h1>
        <p>Get your colleagues on board (you can skip this).</p>
      </div>

      <div className="auth-invite-list">
        {invites.map((invite) => (
          <div className="auth-invite-row" key={invite}>
            <input className="auth-input" type="email" placeholder="colleague@company.com" />
            <select className="auth-input" defaultValue="manager">
              <option value="manager">Manager</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        ))}
      </div>

      <button type="button" className="auth-add" onClick={onAddInvite}>
        <Plus size={18} />
        Add another
      </button>
    </>
  );
}
