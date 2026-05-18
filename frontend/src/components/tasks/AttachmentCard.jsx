import { Download, Eye, UserRound } from "lucide-react";
import {
  formatAttachmentDate,
  getFilenameFromUrl,
  getFileMeta,
  isImageFile,
} from "./attachmentUtils";

function formatRole(role) {
  if (!role) return "Member";
  return String(role)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AttachmentCard({ attachment, onPreview }) {
  const filename = getFilenameFromUrl(attachment.file);
  const image = isImageFile(attachment.file);
  const { Icon, label, tone } = getFileMeta(attachment.file);
  const uploader = attachment.uploaded_by_data || {};

  const handleDownload = () => {
    window.open(attachment.file, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="ta-card">
      <div className={`ta-file-visual ta-file-visual--${tone}`}>
        {image ? (
          <img src={attachment.file} alt="" loading="lazy" />
        ) : (
          <Icon size={28} />
        )}
        <span>{label}</span>
      </div>

      <div className="ta-card-body">
        <div className="ta-file-heading">
          <h3 title={filename}>{filename}</h3>
          <span>{formatAttachmentDate(attachment.uploaded_at)}</span>
        </div>

        <div className="ta-uploader">
          <div className="ta-uploader-avatar">
            {uploader.name ? uploader.name.slice(0, 2).toUpperCase() : <UserRound size={14} />}
          </div>
          <div>
            <strong>{uploader.name || "Unknown user"}</strong>
            <span>{formatRole(uploader.role)}</span>
          </div>
        </div>
      </div>

      <div className="ta-card-actions">
        {image && (
          <button
            type="button"
            className="ta-action-button"
            onClick={() => onPreview(attachment)}
            aria-label={`Preview ${filename}`}
            title="Preview"
          >
            <Eye size={16} />
            <span>Preview</span>
          </button>
        )}

        <button
          type="button"
          className="ta-action-button ta-action-button--primary"
          onClick={handleDownload}
          aria-label={`Download ${filename}`}
          title="Download"
        >
          <Download size={16} />
          <span>Download</span>
        </button>
      </div>
    </article>
  );
}
