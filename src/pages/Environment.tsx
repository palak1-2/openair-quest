/**
 * src/pages/Environment.tsx
 *
 * Screen 3 — Environment
 *
 * User selects:
 *   - General environment (park | garden | campus | neighborhood | not-sure)
 *   - Optional photo upload (the deterministic mock provider does not analyze it)
 */
import { useState, useRef } from "react";
import type { JSX, ChangeEvent } from "react";
import type { EnvironmentOption } from "@/types";

interface EnvironmentProps {
  onComplete: (environment: EnvironmentOption, photo?: Blob) => void;
  onBack: () => void;
}

const ENVIRONMENTS: { value: EnvironmentOption; label: string; icon: string }[] = [
  { value: "park", label: "Park", icon: "🌳" },
  { value: "garden", label: "Garden", icon: "🌼" },
  { value: "campus", label: "Campus", icon: "🏛️" },
  { value: "neighborhood", label: "Neighborhood", icon: "🏘️" },
  { value: "not-sure", label: "Not sure", icon: "🔍" },
];

export function Environment({ onComplete, onBack }: EnvironmentProps): JSX.Element {
  const [environment, setEnvironment] = useState<EnvironmentOption | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const [photoError, setPhotoError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canProceed = environment !== null;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setPhotoError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError("Please upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      setPhotoError("Image must be smaller than 10 MB.");
      return;
    }

    setPhoto(file);
    setPhotoName(file.name);
  }

  function handleRemovePhoto() {
    setPhoto(null);
    setPhotoName("");
    setPhotoError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="page" id="main-content" aria-label="Select your environment">
      <div className="container">
        <header className="page__header">
          <h1 className="page__title">Your Environment</h1>
          <p className="page__subtitle">
            Where are you? Select the option that best matches your surroundings.
          </p>
        </header>

        {/* Environment selector */}
        <section aria-labelledby="env-heading">
          <h2 id="env-heading" className="sr-only">
            Environment options
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="env-heading"
            className="choice-grid"
            style={{ marginBottom: "var(--space-6)" }}
          >
            {ENVIRONMENTS.map(({ value, label, icon }) => {
              const isSelected = environment === value;
              return (
                <label
                  key={value}
                  htmlFor={`env-${value}`}
                  className={`choice-card choice-card--environment${isSelected ? " choice-card--selected" : ""}`}
                >
                  <input
                    type="radio"
                    id={`env-${value}`}
                    name="environment"
                    value={value}
                    checked={isSelected}
                    onChange={() => setEnvironment(value)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="choice-card__icon">{icon}</span>
                  <span className="choice-card__label">{label}</span>
                </label>
              );
            })}
          </div>
        </section>

        <div className="divider" />

        {/* Optional photo upload */}
        <section aria-labelledby="photo-heading">
          <h2 id="photo-heading" className="section-heading section-heading--compact">
            Optional photo
          </h2>
          <p className="choice-card__description" style={{ marginBottom: "var(--space-4)" }}>
            In local AI mode, an uploaded photo is processed by Ollama on this
            device. In mock mode, photos are not analyzed. Activities can also
            use your manual environment selection without a photo.
          </p>

          {photoError && (
            <div className="banner banner--error" role="alert" aria-live="assertive" style={{ marginBottom: "var(--space-4)" }}>
              {photoError}
            </div>
          )}

          {!photo ? (
            <label
              htmlFor="photo-upload"
              className="photo-upload"
            >
              <span aria-hidden="true" className="choice-card__icon">📷</span>
              <span>Tap to upload a photo (optional)</span>
              <span className="photo-upload__hint">JPEG, PNG, WebP or GIF · max 10 MB</span>
              <input
                type="file"
                id="photo-upload"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="sr-only"
                aria-describedby="photo-upload-desc"
              />
            </label>
          ) : (
            <div className="card photo-file">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span aria-hidden="true">🖼️</span>
                <span className="photo-file__name">
                  {photoName}
                </span>
              </div>
              <button
                id="btn-remove-photo"
                className="btn-secondary"
                onClick={handleRemovePhoto}
                aria-label="Remove uploaded photo"
                style={{ flexShrink: 0 }}
              >
                Remove
              </button>
            </div>
          )}

          <p id="photo-upload-desc" className="sr-only">
            Optional image upload. In local AI mode, this image is processed only by Ollama on this device.
          </p>
        </section>

        {/* Actions */}
        <div className="page__actions">
          <button
            id="btn-continue-environment"
            className="btn-primary"
            disabled={!canProceed}
            onClick={() => {
              if (environment) {
                console.info("[OpenAir Quest][FLOW] Environment Continue clicked.", {
                  imageSelected: photo !== null,
                });
                onComplete(environment, photo ?? undefined);
              }
            }}
            aria-disabled={!canProceed}
          >
            Continue
          </button>
          <button id="btn-back-environment" className="btn-secondary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
