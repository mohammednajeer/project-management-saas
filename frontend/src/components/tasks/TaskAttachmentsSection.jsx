import AttachmentsSectionBase from "./AttachmentsSectionBase";

const endpoints = {
  list: (taskId) => `/tasks/${taskId}/attachments/`,
  upload: (taskId) => `/tasks/${taskId}/attachments/upload/`,
  delete: (attachmentId) => `/tasks/attachments/${attachmentId}/delete/`,
};

export default function TaskAttachmentsSection({ taskId }) {
  return (
    <AttachmentsSectionBase
      resourceId={taskId}
      title="Attachments"
      subtitle="Task documents, previews, and shared deliverables"
      listEndpoint={endpoints.list}
      uploadEndpoint={endpoints.upload}
      deleteEndpoint={endpoints.delete}
      emptyTitle="No attachments uploaded yet"
      emptyDescription="Upload a file to keep task context, references, and handoff material in one place."
    />
  );
}
