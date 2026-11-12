import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * The only button in the project.
 *
 * Turquoise means "do something" (upload, download, save). Gold is reserved
 * for value and framing — never a primary button, or the page looks cheap.
 * See PROJECT.md 1.4.
 */
type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium " +
  "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-turquoise text-ink hover:bg-turquoise-d",
  secondary:
    "border border-gold-d text-gold hover:border-gold hover:bg-gold/10",
  ghost: "text-muted hover:text-white",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-7 py-3 text-base",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = CommonProps & { href: string };
type ButtonAsButton = CommonProps &
  ComponentProps<"button"> & { href?: undefined };

function classes({ variant = "primary", size = "md", className = "" }: CommonProps) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}

export default function Button(props: ButtonAsLink | ButtonAsButton) {
  if (props.href !== undefined) {
    const { href, children, variant, size, className } = props;
    return (
      <Link href={href} className={classes({ variant, size, className, children })}>
        {children}
      </Link>
    );
  }

  const { children, variant, size, className, ...rest } = props;
  return (
    <button className={classes({ variant, size, className, children })} {...rest}>
      {children}
    </button>
  );
}
