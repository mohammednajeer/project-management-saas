import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import api from "../../services/api";
import AttachmentCard from "./AttachmentCard";
import AttachmentPreviewModal from "./AttachmentPreviewModal";
import "./TaskAttachmentsSection.css";

export default function TaskAttachmentsSection({ taskId }) {
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const fetchAttachments = useCallback(
    async (signal) => {
      if (!taskId) return;

      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/tasks/${taskId}/attachments/`, { signal });
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
    [taskId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAttachments(controller.signal);

    return () => controller.abort();
  }, [fetchAttachments]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || uploading) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setError("");

      await api.post(`/tasks/${taskId}/attachments/upload/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchAttachments();
    } catch (err) {
      console.log(err);
      const message =
        err.response?.data?.detail ||
        err.response?.data?.file?.[0] ||
        "Upload failed. Please try again.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="ta-section" aria-labelledby="task-attachments-title">
      <div className="ta-header">
        <div>
          <div className="ta-eyebrow">
            <Paperclip size={14} />
            Files
          </div>
          <h2 id="task-attachments-title">Attachments</h2>
          <p>Task documents, previews, and shared deliverables</p>
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
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? <Loader2 size={16} className="ta-spin" /> : <UploadCloud size={16} />}
            {uploading ? "Uploading" : "Upload"}
          </button>
        </div>
      </div>

      {error && (
        <div className="ta-toast" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss attachment error">
            <X size={14} />
          </button>
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
          <h3>No attachments uploaded yet</h3>
          <p>Upload a file to keep task context, references, and handoff material in one place.</p>
        </div>
      ) : (
        <div className="ta-grid">
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              onPreview={setPreviewAttachment}
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
