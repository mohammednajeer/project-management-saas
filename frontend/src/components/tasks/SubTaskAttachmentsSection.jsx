import AttachmentsSectionBase from "./AttachmentsSectionBase";

const endpoints = {
  list: (subtaskId) => `/tasks/subtasks/${subtaskId}/attachments/`,
  upload: (subtaskId) => `/tasks/subtasks/${subtaskId}/attachments/upload/`,
  delete: (attachmentId) => `/tasks/subtasks/attachments/${attachmentId}/delete/`,
};

export default function SubTaskAttachmentsSection({ subtaskId }) {
  return (
    <AttachmentsSectionBase
      resourceId={subtaskId}
      title="Work Attachments"
      subtitle="Upload proof, screenshots, reports, or deliverables."
      listEndpoint={endpoints.list}
      uploadEndpoint={endpoints.upload}
      deleteEndpoint={endpoints.delete}
      emptyTitle="No work attachments uploaded yet"
      emptyDescription="Upload proof, screenshots, reports, or deliverables for this subtask."
    />
  );
}
