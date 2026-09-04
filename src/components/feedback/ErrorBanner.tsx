import { ApiError } from "../../api/client";
import { JellyPanel } from "../jelly/JellyPanel";
import "./errorBanner.css";

interface ErrorBannerProps {
  error: unknown;
  title?: string;
}

export function ErrorBanner({ error, title }: ErrorBannerProps) {
  const isApiError = error instanceof ApiError;
  const message = error instanceof Error ? error.message : String(error);

  return (
    <JellyPanel className="error-banner" radius="lg">
      <div className="error-banner-title">{title ?? (isApiError ? `Ошибка · ${error.code}` : "Что-то пошло не так")}</div>
      <div className="error-banner-message">{message}</div>
      {isApiError && error.details.length > 0 ? (
        <ul className="error-banner-details">
          {error.details.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </JellyPanel>
  );
}
