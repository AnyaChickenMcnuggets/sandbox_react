import { forwardRef, type ButtonHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";
import "./jellyButton.css";

export type JellyButtonVariant = "primary" | "secondary" | "danger" | "ghost";

// framer-motion переопределяет несколько нативных DOM-событий (onDrag и т.п.) под свою жестовую
// систему — исключаем их из нативных ButtonHTMLAttributes, чтобы избежать конфликта типов.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

interface JellyButtonProps extends NativeButtonProps, Omit<HTMLMotionProps<"button">, keyof NativeButtonProps> {
  variant?: JellyButtonVariant;
  size?: "sm" | "md";
}

export const JellyButton = forwardRef<HTMLButtonElement, JellyButtonProps>(function JellyButton(
  { variant = "primary", size = "md", className, children, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      className={clsx("jelly-button", `jelly-button-${variant}`, `jelly-button-${size}`, className)}
      whileHover={disabled ? undefined : { scale: 1.045, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.93, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 15, mass: 0.6 }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
