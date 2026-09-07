import clsx from "clsx";
import { Blob, type BlobProps } from "./Blob";

type JellyPanelProps = BlobProps;

// Панели — "хромовые" поверхности (плавают над холстом/списком), поэтому Liquid Glass включён
// по умолчанию; передайте glass={false} явно, если нужен сплошной непрозрачный фон.
export function JellyPanel({ radius = "lg", glass = true, className, ...rest }: JellyPanelProps) {
  return <Blob radius={radius} glass={glass} className={clsx("jelly-panel", className)} {...rest} />;
}
