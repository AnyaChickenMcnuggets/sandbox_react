import clsx from "clsx";
import { Blob, type BlobProps } from "./Blob";

type JellyPanelProps = BlobProps;

export function JellyPanel({ radius = "lg", className, ...rest }: JellyPanelProps) {
  return <Blob radius={radius} className={clsx("jelly-panel", className)} {...rest} />;
}
