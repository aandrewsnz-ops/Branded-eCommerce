import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  AI_OPERATION_CONFIG,
  formatElapsed,
  getActiveStepIndex,
  getOperationMaxSeconds,
  type AiOperation,
} from "../lib/aiProgress";
import { formatCopyFailureStage, type CopyFailureStage } from "../lib/copyGenerateErrors";
import {
  formatDurationMs,
  formatTokenCount,
  formatUsd,
} from "../lib/aiUsageFormat";
import type { AiUsageSummary } from "../types";

export type AiOverlayStatus = "running" | "success" | "error";

export interface AiProgressOverlayProps {
  operation: AiOperation;
  status: AiOverlayStatus;
  startedAt: number;
  usage?: AiUsageSummary | null;
  errorStage?: CopyFailureStage | null;
  errorDetails?: string | null;
  onContinue?: () => void;
}

export function AiProgressOverlay({
  operation,
  status,
  startedAt,
  usage = null,
  errorStage = null,
  errorDetails = null,
  onContinue,
}: AiProgressOverlayProps) {
  const [tick, setTick] = useState(() => Date.now());
  const isRunning = status === "running";
  const isError = status === "error";
  const isSuccess = status === "success";

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => setTick(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const config = AI_OPERATION_CONFIG[operation];
  const maxSeconds = getOperationMaxSeconds(operation);
  const elapsedMs = Math.max(0, tick - startedAt);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const remainingSec = Math.max(0, maxSeconds - elapsedSec);
  const isOvertime = elapsedSec >= maxSeconds;
  const activeStep = getActiveStepIndex(elapsedSec);
  const progressPct = Math.min(100, (elapsedSec / maxSeconds) * 100);

  const hasUsage =
    usage != null &&
    (usage.input_tokens != null ||
      usage.output_tokens != null ||
      usage.total_tokens != null ||
      usage.estimated_cost_usd != null ||
      usage.duration_ms != null ||
      usage.model != null);

  const displayDurationMs = usage?.duration_ms ?? elapsedMs;

  const overlayClass = [
    "ai-progress-overlay",
    isSuccess ? "is-success" : "",
    isError ? "is-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const title = isRunning
    ? config.title
    : isError
      ? (config.errorTitle ?? `${config.title} failed`)
      : config.successTitle;

  const description = isRunning
    ? config.description
    : isError
      ? (errorDetails?.trim() ||
          "The request failed before the copy pack could be saved.")
      : "The AI response was received, validated, and saved.";

  return (
    <div
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-progress-title"
      aria-describedby="ai-progress-desc"
    >
      <div className="ai-progress-card">
        <div className="ai-progress-head">
          {isRunning ? (
            <Loader2
              size={22}
              strokeWidth={2}
              className="spin ai-progress-spinner"
              aria-hidden
            />
          ) : isError ? (
            <AlertCircle
              size={22}
              strokeWidth={2}
              className="ai-progress-error-icon"
              aria-hidden
            />
          ) : (
            <CheckCircle2
              size={22}
              strokeWidth={2}
              className="ai-progress-success-icon"
              aria-hidden
            />
          )}
          <div>
            <h2 id="ai-progress-title" className="ai-progress-title">
              {title}
            </h2>
            <p id="ai-progress-desc" className="ai-progress-desc">
              {description}
            </p>
            {isError && errorStage ? (
              <p className="ai-progress-error-stage" role="status">
                Stage: {formatCopyFailureStage(errorStage)}
              </p>
            ) : null}
          </div>
        </div>

        {isRunning ? (
          <>
            <div className="ai-progress-timers">
              <div className="ai-progress-timer-block">
                <span className="ai-progress-timer-label">
                  {isOvertime ? "Elapsed" : "Countdown"}
                </span>
                <span
                  className={`ai-progress-timer-value${isOvertime ? " is-overtime" : ""}`}
                  aria-live="polite"
                >
                  {isOvertime
                    ? formatElapsed(elapsedSec)
                    : `${remainingSec}s`}
                </span>
              </div>
              <div className="ai-progress-timer-block">
                <span className="ai-progress-timer-label">Elapsed</span>
                <span className="ai-progress-timer-value ai-progress-timer-elapsed">
                  {formatElapsed(elapsedSec)}
                </span>
              </div>
              <div className="ai-progress-timer-block">
                <span className="ai-progress-timer-label">Estimated max</span>
                <span className="ai-progress-timer-value">{maxSeconds}s</span>
              </div>
            </div>

            <div
              className="ai-progress-bar-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={maxSeconds}
              aria-valuenow={Math.min(elapsedSec, maxSeconds)}
              aria-label="Estimated progress"
            >
              <div
                className="ai-progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {isOvertime ? (
              <p className="ai-progress-overtime" role="status">
                Still working… This is taking longer than expected. The request
                may still complete, but if it fails the app will show the error
                here.
              </p>
            ) : (
              <p className="ai-progress-reassurance">{config.reassurance}</p>
            )}

            <ol
              className="ai-progress-steps"
              aria-label="Estimated progress steps"
            >
              {config.steps.map((step, index) => (
                <li
                  key={step}
                  className={`ai-progress-step${
                    index === activeStep ? " is-active" : ""
                  }${index < activeStep ? " is-done" : ""}`}
                >
                  <span className="ai-progress-step-marker" aria-hidden />
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <p className="ai-progress-tech">{config.technicalDetail}</p>

            <footer className="ai-progress-foot">
              <p>Do not refresh this page while the request is running.</p>
              <p className="ai-progress-debug">
                Operation: {operation.replace(/_/g, "-")} · Estimated max:{" "}
                {maxSeconds}s
              </p>
            </footer>
          </>
        ) : (
          <>
            <div className="ai-progress-usage" role="status">
              {hasUsage ? (
                <dl className="ai-progress-usage-grid">
                  <div className="ai-progress-usage-item">
                    <dt>Input</dt>
                    <dd>{formatTokenCount(usage?.input_tokens)}</dd>
                  </div>
                  <div className="ai-progress-usage-item">
                    <dt>Output</dt>
                    <dd>{formatTokenCount(usage?.output_tokens)}</dd>
                  </div>
                  {!isError ? (
                    <div className="ai-progress-usage-item">
                      <dt>Total</dt>
                      <dd>{formatTokenCount(usage?.total_tokens)}</dd>
                    </div>
                  ) : null}
                  {(usage?.cached_input_tokens ?? 0) > 0 ? (
                    <div className="ai-progress-usage-item">
                      <dt>Cached input</dt>
                      <dd>{formatTokenCount(usage?.cached_input_tokens)}</dd>
                    </div>
                  ) : null}
                  <div className="ai-progress-usage-item">
                    <dt>Estimated cost</dt>
                    <dd>{formatUsd(usage?.estimated_cost_usd)}</dd>
                  </div>
                  {!isError ? (
                    <div className="ai-progress-usage-item">
                      <dt>Duration</dt>
                      <dd>{formatDurationMs(displayDurationMs)}</dd>
                    </div>
                  ) : null}
                  {!isError ? (
                    <div className="ai-progress-usage-item ai-progress-usage-item-wide">
                      <dt>Model</dt>
                      <dd>{usage?.model?.trim() || "Not available"}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="ai-progress-usage-missing">
                  {isError
                    ? "No token usage was returned."
                    : "Usage details were not returned for this request."}
                </p>
              )}
            </div>

            <div className="ai-progress-actions">
              <button
                type="button"
                className="btn btn-primary ai-progress-continue"
                onClick={onContinue}
              >
                Continue
              </button>
            </div>

            <footer className="ai-progress-foot">
              <p className="ai-progress-debug">
                Operation: {operation.replace(/_/g, "-")}
                {usage?.operation ? ` · API: ${usage.operation}` : ""}
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
