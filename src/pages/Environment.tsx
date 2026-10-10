import { useEffect, useRef, useState } from "react";
import type { JSX, ChangeEvent } from "react";
import type { EnvironmentOption } from "@/types";
import type { AIMode } from "@/ai/providerFactory";
import { Icon } from "@/Icon";

interface EnvironmentProps {
  onComplete: (environment: EnvironmentOption, photo?: Blob) => void;
  onBack: () => void;
  aiMode?: AIMode;
}

const ENVIRONMENTS: {
  value: EnvironmentOption;
  label: string;
  description: string;
  icon: "tree" | "flower" | "building" | "home" | "help";
  reflection: string;
}[] = [
  { value: "park", label: "Park", description: "Open green space", icon: "tree", reflection: "Room to wander and notice" },
  { value: "garden", label: "Garden", description: "Plants and flowers", icon: "flower", reflection: "Small details, close at hand" },
  { value: "campus", label: "Campus", description: "A school or university", icon: "building", reflection: "A familiar place, seen anew" },
  { value: "neighborhood", label: "Neighborhood", description: "Nearby paths and places", icon: "home", reflection: "Everyday surroundings, gently noticed" },
  { value: "not-sure", label: "Not sure", description: "Keep the activity flexible", icon: "help", reflection: "A quest that can meet you anywhere" },
];

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Environment({
  onComplete,
  onBack,
  aiMode = "mock",
}: EnvironmentProps): JSX.Element {
  const [environment, setEnvironment] = useState<EnvironmentOption | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef<string | null>(null);
  const selection = ENVIRONMENTS.find((item) => item.value === environment);

  useEffect(() => () => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setPhotoError("");
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setPhotoError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("The image must be smaller than 10 MB.");
      return;
    }

    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    const nextUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
    photoUrlRef.current = nextUrl;
    setPhotoUrl(nextUrl);
    setPhoto(file);
  }

  function removePhoto() {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setPhotoUrl(null);
    setPhoto(null);
    setPhotoError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main
      className="page environment-page"
      id="main-content"
      aria-label="Select your environment"
      data-environment={environment ?? "unset"}
    >
      <div className="page-frame">
        <header className="page__header page__header--left">
          <p className="eyebrow">Step 02 <span aria-hidden="true">—</span> Surrounding context</p>
          <h1 className="page__title">Where are you heading outside?</h1>
          <p className="page__subtitle">
            Choose the place that feels closest. Your quest will take its cues from here.
          </p>
        </header>

        <div className="environment-layout">
          <div className="environment-choices">
            <section aria-labelledby="env-heading">
              <h2 id="env-heading" className="sr-only">Environment options</h2>
              <div role="radiogroup" aria-labelledby="env-heading" className="environment-list">
                {ENVIRONMENTS.map(({ value, label, description, icon }) => {
                  const selected = environment === value;
                  return (
                    <label
                      key={value}
                      htmlFor={`env-${value}`}
                      className={`environment-choice${selected ? " is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        id={`env-${value}`}
                        name="environment"
                        value={value}
                        checked={selected}
                        onChange={() => setEnvironment(value)}
                        className="sr-only"
                      />
                      <span className="environment-choice__icon"><Icon name={icon} size={22} /></span>
                      <span className="environment-choice__copy">
                        <span className="environment-choice__name">{label}</span>
                        <span className="environment-choice__description">{description}</span>
                      </span>
                      <span className="environment-choice__indicator" aria-hidden="true">
                        <Icon name="check" size={17} />
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="photo-context-input" aria-labelledby="photo-heading">
              <div className="photo-context-input__heading">
                <Icon name="camera" size={18} />
                <h2 id="photo-heading">Feed local context <span>Optional</span></h2>
              </div>
              {photoError && <p className="form-error" role="alert">{photoError}</p>}
              {!photo ? (
                <label htmlFor="photo-upload" className="photo-prompt">
                  <span className="photo-prompt__action">Choose a photo</span>
                  <span className="photo-prompt__detail">Your photo stays on this device in Local AI mode.</span>
                  <span className="photo-prompt__hint">JPEG, PNG, WebP, or GIF · up to 10 MB</span>
                  <input
                    type="file"
                    id="photo-upload"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="sr-only"
                    aria-label="Tap to upload a photo (optional)"
                    aria-describedby="photo-runtime-truth"
                  />
                </label>
              ) : (
                <div className="selected-photo" aria-label={`Selected photo: ${photo.name}`}>
                  {photoUrl
                    ? <img src={photoUrl} alt="" className="selected-photo__image" />
                    : <span className="selected-photo__fallback"><Icon name="camera" size={22} /></span>}
                  <span className="selected-photo__details">
                    <span className="selected-photo__name">{photo.name}</span>
                    <span className="selected-photo__size">{formatFileSize(photo.size)} · on this device</span>
                  </span>
                  <button type="button" className="text-action" onClick={removePhoto}>Remove</button>
                </div>
              )}
              <p className="photo-runtime-truth" id="photo-runtime-truth">
                {aiMode === "local"
                  ? "Local AI interprets the photo on this device. Your environment selection is used if the photo cannot be interpreted."
                  : "Demo mode does not analyze photos; your environment selection will guide the quest."}
              </p>
            </section>
          </div>

          <aside className="environment-impression" aria-live="polite" aria-label="Environment setting">
            <span className="environment-impression__eyebrow">
              {selection ? "Your setting" : "Begin with a place"}
            </span>
            <span className="environment-impression__icon">
              <Icon name={selection?.icon ?? "tree"} size={46} />
            </span>
            <p className="environment-impression__name">{selection?.label ?? "Somewhere outside"}</p>
            <p className="environment-impression__reflection">
              {selection?.reflection ?? "Choose what feels closest. You can keep it flexible."}
            </p>
            <span className="environment-impression__horizon" aria-hidden="true" />
          </aside>
        </div>

        <div className="page__actions page__actions--flow">
          <button id="btn-back-environment" className="text-action" onClick={onBack}>
            <Icon name="arrow-left" size={18} /> Back
          </button>
          <button
            id="btn-continue-environment"
            className="btn-primary"
            disabled={!environment}
            onClick={() => environment && onComplete(environment, photo ?? undefined)}
            aria-disabled={!environment}
          >
            Prepare my quest <Icon name="arrow-right" size={19} />
          </button>
        </div>
      </div>
    </main>
  );
}
