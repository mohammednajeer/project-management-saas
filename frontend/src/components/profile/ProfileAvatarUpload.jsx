import { useRef, useState } from "react";
import { Camera, Loader2, UploadCloud } from "lucide-react";
import useProfile from "../../context/profile/useProfile";
import { getInitials, getProfileError } from "./profileUtils";

export default function ProfileAvatarUpload({ profile, onMessage }) {
  const inputRef = useRef(null);
  const { updateProfile } = useProfile();
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      onMessage("error", "Please choose an image file.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      setUploading(true);
      setProgress(0);

      await updateProfile(formData, (event) => {
        if (event.total) setProgress(Math.round((event.loaded * 100) / event.total));
      });

      onMessage("success", "Profile picture updated.");
      setPreview("");
    } catch (err) {
      console.log(err);
      onMessage("error", getProfileError(err, "Avatar upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    uploadFile(event.dataTransfer.files?.[0]);
  };

  const image = preview || profile?.profile_picture;

  return (
    <div
      className={`profile-avatar-upload ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <button type="button" className="profile-avatar-button" onClick={() => inputRef.current?.click()}>
        {image ? <img src={image} alt={profile?.name || "Profile"} /> : <span>{getInitials(profile)}</span>}
        <div className="profile-avatar-overlay">
          {uploading ? <Loader2 size={22} className="profile-spin" /> : <Camera size={22} />}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(event) => uploadFile(event.target.files?.[0])}
        hidden
      />

      <div className="profile-upload-copy">
        <strong>Profile photo</strong>
        <span>
          <UploadCloud size={14} />
          {uploading ? `Uploading ${progress}%` : "Drop image or click to replace"}
        </span>
      </div>
    </div>
  );
}
