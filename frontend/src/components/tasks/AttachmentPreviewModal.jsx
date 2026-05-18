import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { getAttachmentFilename } from "./attachmentUtils";

export default function AttachmentPreviewModal({ attachment, onClose }) {
  useEffect(() => {
    if (!attachment) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.classList.add("ta-modal-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("ta-modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [attachment, onClose]);

  if (!attachment) return null;

  const filename = getAttachmentFilename(attachment);

  return (
    <div className="ta-modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="ta-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${filename}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ta-preview-header">
          <div>
            <span>Image preview</span>
            <h3>{filename}</h3>
          </div>

          <div className="ta-preview-actions">
            <a
              className="ta-icon-button"
              href={attachment.file}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Download ${filename}`}
              title="Download"
            >
              <Download size={18} />
            </a>
            <button
              type="button"
              className="ta-icon-button"
              onClick={onClose}
              aria-label="Close preview"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="ta-preview-stage">
          <img src={attachment.file} alt={filename} />
        </div>
      </section>
    </div>
  );
}
