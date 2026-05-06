import { useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import api from "../../services/api";
import "./BulkInviteModal.css";

export default function BulkInviteModal({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("Choose a CSV file before uploading.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/invitations/bulk/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(res.data);
      await onSuccess();
      console.log("Bulk invite refresh completed");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload CSV.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="bulk-overlay" onClick={onClose}>
      <div className="bulk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bulk-header">
          <div>
            <p className="bulk-eyebrow">CSV upload</p>
            <h2>Bulk Invite Members</h2>
          </div>

          <button type="button" className="bulk-close" onClick={onClose} aria-label="Close bulk invite modal">
            X
          </button>
        </div>

        <form onSubmit={handleUpload} className="bulk-form">
          <label className={`bulk-dropzone ${file ? "bulk-dropzone--selected" : ""}`}>
            <span className="bulk-dropzone-icon">
              <FileSpreadsheet size={24} />
            </span>
            <span className="bulk-dropzone-title">
              {file ? file.name : "Choose a CSV file"}
            </span>
            <span className="bulk-dropzone-sub">
              {file ? `${Math.max(file.size / 1024, 1).toFixed(0)} KB selected` : "CSV with email and role columns"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setError("");
              }}
            />
          </label>

          {error && <p className="bulk-error">{error}</p>}

          <button type="submit" disabled={loading} className="bulk-submit">
            <Upload size={16} />
            {loading ? "Uploading..." : "Upload CSV"}
          </button>
        </form>

        {result && (
          <div className="bulk-result">
            <div className="bulk-result-summary">
              <CheckCircle2 size={18} />
              <span>{result.success || 0} invitations created</span>
            </div>

            {result.errors?.length > 0 && (
              <div className="bulk-result-errors">
                <div className="bulk-result-errors-title">
                  <XCircle size={16} />
                  <span>{result.errors.length} rows need attention</span>
                </div>

                <ul>
                {result.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                ))}
                </ul>

                {result.errors.length > 5 && (
                <p className="bulk-more-errors">
                    + {result.errors.length - 5} more errors hidden
                </p>
                )}
              </div>
            )}
            {result.invite_links?.length > 0 && (
                <div className="bulk-links">

                    <p className="bulk-links-title">
                    Testing Invite Links
                    </p>

                    <ul>
                    {result.invite_links
                        .slice(0, 5)
                        .map((item, idx) => (
                        <li key={idx}>
                            <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            >
                            {item.email}
                            </a>
                        </li>
                    ))}
                    </ul>

                </div>
                )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}


