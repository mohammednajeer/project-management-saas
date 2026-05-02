import { useMemo, useState } from "react";
import { ArrowRight, Check, Eye, Plus, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import "../../../styles/auth.css";
import "./Signup.css";

const steps = ["Account", "Workspace", "Invite"];

export default function Signup() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [invites, setInvites] = useState([0, 1, 2]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    workspace_name: "",
  });

  const buttonLabel = useMemo(() => {
    if (currentStep === 2) return "Create workspace";
    return "Continue";
  }, [currentStep]);

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // Move to next step
    if (currentStep < 2) {
      setCurrentStep((step) => step + 1);
      return;
    }

    // Final step → call backend
    setIsLoading(true);

    try {
      await api.post("/organizations/register/", {
        name: formData.workspace_name,
        email: formData.email,
        phone: "0000000000",
        admin_name: formData.name,
        password: formData.password,
      });

      navigate("/dashboard", { replace: true });

    } catch (signupError) {
     console.log(signupError.response?.data);

      setError(
          signupError.response?.data?.message ||
          signupError.response?.data?.email?.[0] ||
          "Signup failed. Please try again."
        )
    } finally {
      setIsLoading(false);
    }
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

        <nav className="auth-stepper">
          {steps.map((step, index) => (
            <button
              type="button"
              className={`auth-step ${
                index < currentStep ? "is-complete" : ""
              } ${index === currentStep ? "is-active" : ""}`}
              key={step}
              onClick={() => setCurrentStep(index)}
            >
              <span className="auth-step-dot">
                {index < currentStep ? <Check size={20} /> : index + 1}
              </span>
              <span className="auth-step-label">{step}</span>
            </button>
          ))}
        </nav>

        <form className="auth-onboarding-card" onSubmit={handleSubmit}>

          {currentStep === 0 && (
            <AccountStep
              formData={formData}
              handleChange={handleChange}
            />
          )}

          {currentStep === 1 && (
            <WorkspaceStep
              formData={formData}
              handleChange={handleChange}
            />
          )}

          {currentStep === 2 && (
            <InviteStep
              invites={invites}
              onAddInvite={() =>
                setInvites((items) => [...items, items.length])
              }
            />
          )}

          {error && (
            <p className="auth-terms" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : buttonLabel}
            <ArrowRight size={18} />
          </button>

        </form>

        <p className="auth-footer-note">
          Already have a workspace? <a href="/signin">Sign in</a>
        </p>

      </section>
    </main>
  );
}

function AccountStep({ formData, handleChange }) {
  return (
    <>
      <div className="auth-form-head auth-form-head-left">
        <h1>Create your account</h1>
        <p>Start your free trial.</p>
      </div>

      <label className="auth-field">
        <span className="auth-label">Full name</span>
        <input
          className="auth-input"
          type="text"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) =>
            handleChange("name", e.target.value)
          }
        />
      </label>

      <label className="auth-field">
        <span className="auth-label">Work email</span>
        <input
          className="auth-input"
          type="email"
          placeholder="you@company.com"
          value={formData.email}
          onChange={(e) =>
            handleChange("email", e.target.value)
          }
        />
      </label>

      <label className="auth-field">
        <span className="auth-label">Password</span>
        <span className="auth-input-wrap">
          <input
            className="auth-input"
            type="password"
            placeholder="Min. 8 characters"
            value={formData.password}
            onChange={(e) =>
              handleChange("password", e.target.value)
            }
          />
          <Eye size={18} />
        </span>
      </label>
    </>
  );
}

function WorkspaceStep({ formData, handleChange }) {
  return (
    <>
      <div className="auth-form-head auth-form-head-left">
        <h1>Set up your workspace</h1>
      </div>

      <label className="auth-field">
        <span className="auth-label">Workspace name</span>
        <input
          className="auth-input"
          type="text"
          placeholder="Acme Corp"
          value={formData.workspace_name}
          onChange={(e) =>
            handleChange("workspace_name", e.target.value)
          }
        />
      </label>
    </>
  );
}

function InviteStep({ invites, onAddInvite }) {
  return (
    <>
      <div className="auth-form-head auth-form-head-left">
        <h1>Invite your team</h1>
        <p>You can skip this step.</p>
      </div>

      <div className="auth-invite-list">
        {invites.map((invite) => (
          <div className="auth-invite-row" key={invite}>
            <input
              className="auth-input"
              type="email"
              placeholder="colleague@company.com"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="auth-add"
        onClick={onAddInvite}
      >
        <Plus size={18} />
        Add another
      </button>
    </>
  );
}