import { Download, Eye, Trash2, UserRound } from "lucide-react";
import {
  getAttachmentFilename,
  formatAttachmentDate,
  getFileMeta,
  isImageFile,
} from "./attachmentUtils";

function formatRole(role) {
  if (!role) return "Member";
  return String(role)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AttachmentCard({ attachment, onPreview, onDelete, canDelete = false }) {
  const filename = getAttachmentFilename(attachment);
  const fileIdentity = attachment.original_name || attachment.file;
  const image = isImageFile(fileIdentity);
  const { Icon, label, tone } = getFileMeta(fileIdentity);
  const uploader = attachment.uploaded_by_data || {};

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
        {image ? (
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
        ) : (
          <a
            className="ta-action-button"
            href={attachment.file}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Preview ${filename}`}
            title="Preview"
          >
            <Eye size={16} />
            <span>Preview</span>
          </a>
        )}

        <a
          className="ta-action-button ta-action-button--primary"
          href={attachment.file}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${filename}`}
          title="Download"
        >
          <Download size={16} />
          <span>Download</span>
        </a>

        {canDelete && (
          <button
            type="button"
            className="ta-action-button ta-action-button--danger"
            onClick={() => onDelete(attachment)}
            aria-label={`Delete ${filename}`}
            title="Delete"
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        )}
      </div>
    </article>
  );
}
