import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AttachmentCard from "./AttachmentCard";
import AttachmentPreviewModal from "./AttachmentPreviewModal";
import "./TaskAttachmentsSection.css";

const managerRoles = new Set(["admin", "manager"]);

function getErrorMessage(err, fallback) {
  return (
    err.response?.data?.detail ||
    err.response?.data?.message ||
    err.response?.data?.file?.[0] ||
    fallback
  );
}

export default function AttachmentsSectionBase({
  resourceId,
  title,
  subtitle,
  listEndpoint,
  uploadEndpoint,
  deleteEndpoint,
  emptyTitle,
  emptyDescription,
  allowOwnerDelete = false,
}) {
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const fetchAttachments = useCallback(
    async (signal) => {
      if (!resourceId) return;

      try {
        setLoading(true);
        setError("");

        const response = await api.get(listEndpoint(resourceId), { signal });
        setAttachments(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        console.log(err);
        setError("Unable to load attachments.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [listEndpoint, resourceId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAttachments(controller.signal);

    return () => controller.abort();
  }, [fetchAttachments]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || uploading || !resourceId) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setError("");

      await api.post(uploadEndpoint(resourceId), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchAttachments();
    } catch (err) {
      console.log(err);
      setError(getErrorMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const canDeleteAttachment = (attachment) => {
    if (managerRoles.has(user?.role)) return true;

    return (
      allowOwnerDelete &&
      user?.id &&
      attachment.uploaded_by_data?.id &&
      String(user.id) === String(attachment.uploaded_by_data.id)
    );
  };

  const handleDelete = async (attachment) => {
    const confirmed = window.confirm("Are you sure you want to delete this attachment?");
    if (!confirmed) return;

    try {
      setDeletingId(attachment.id);
      setError("");

      await api.delete(deleteEndpoint(attachment.id));
      setAttachments((items) => items.filter((item) => item.id !== attachment.id));
    } catch (err) {
      console.log(err);
      setError(getErrorMessage(err, "Delete failed. Please try again."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="ta-section" aria-labelledby={`attachments-title-${resourceId}`}>
      <div className="ta-header">
        <div>
          <div className="ta-eyebrow">
            <Paperclip size={14} />
            Files
          </div>
          <h2 id={`attachments-title-${resourceId}`}>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="ta-header-actions">
          <span className="ta-count">{attachments.length}</span>
          <input
            ref={fileInputRef}
            type="file"
            className="ta-file-input"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="ta-upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 size={16} className="ta-spin" /> : <UploadCloud size={16} />}
            {uploading ? "Uploading" : "Upload"}
          </button>
        </div>
      </div>

      {(error || deletingId) && (
        <div className={`ta-toast ${deletingId ? "ta-toast--info" : ""}`} role="alert">
          {deletingId ? <Loader2 size={16} className="ta-spin" /> : <AlertCircle size={16} />}
          <span>{deletingId ? "Deleting attachment..." : error}</span>
          {!deletingId && (
            <button type="button" onClick={() => setError("")} aria-label="Dismiss attachment error">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="ta-grid" aria-label="Loading attachments">
          {[0, 1, 2].map((item) => (
            <div className="ta-skeleton-card" key={item}>
              <div className="ta-skeleton-preview" />
              <div className="ta-skeleton-line ta-skeleton-line--wide" />
              <div className="ta-skeleton-line" />
            </div>
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div className="ta-empty">
          <div className="ta-empty-icon">
            <Paperclip size={24} />
          </div>
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        <div className="ta-grid">
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              onPreview={setPreviewAttachment}
              onDelete={handleDelete}
              canDelete={canDeleteAttachment(attachment)}
            />
          ))}
        </div>
      )}

      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </section>
  );
}
