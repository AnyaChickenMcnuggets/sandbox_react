import { forwardRef, type ButtonHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";
import "./jellyButton.css";

export type JellyButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";

// framer-motion переопределяет несколько нативных DOM-событий (onDrag и т.п.) под свою жестовую
// систему — исключаем их из нативных ButtonHTMLAttributes, чтобы избежать конфликта типов.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

interface JellyButtonProps extends NativeButtonProps, Omit<HTMLMotionProps<"button">, keyof NativeButtonProps> {
  variant?: JellyButtonVariant;
  size?: "sm" | "md";
  /** Круглая кнопка только с иконкой — обязательно передавать title/aria-label */
  iconOnly?: boolean;
}

export const JellyButton = forwardRef<HTMLButtonElement, JellyButtonProps>(function JellyButton(
  { variant = "primary", size = "md", className, children, disabled, iconOnly, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      className={clsx(
        "jelly-button",
        `jelly-button-${variant}`,
        `jelly-button-${size}`,
        iconOnly && "jelly-button-icon",
        className,
      )}
      // Резиновый эффект: hover — низкий damping даёт заметный перелёт/покачивание при возврате,
      // tap — сплющивание (squash) по X/Y вместо равномерного scale, как у настоящего мармеладного
      // мишки под пальцем; отпускание пружинит обратно с тем же "жидким" transition.
      whileHover={disabled ? undefined : { scale: 1.08, y: -3, rotate: [0, -1.5, 1.5, 0] }}
      whileTap={disabled ? undefined : { scaleX: 1.16, scaleY: 0.8, y: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 9, mass: 0.7 }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
