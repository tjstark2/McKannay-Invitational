import {
  GREEN_FALLBACK,
  isStockBackground,
  stockSrc,
} from "@/lib/backgrounds";

/**
 * Fills its parent. Renders:
 *  - a solid light-green panel when no background is set,
 *  - responsive stock scene (mobile portrait < 768px, desktop landscape above),
 *  - or a custom uploaded image, cover-fit for both orientations.
 * The caller controls size via the wrapping element.
 */
export function CourseBackground({
  value,
  className = "",
  alt = "",
}: {
  value: string | null | undefined;
  className?: string;
  alt?: string;
}) {
  if (!value) {
    return (
      <div
        className={`h-full w-full ${className}`}
        style={{ backgroundColor: GREEN_FALLBACK }}
        aria-hidden="true"
      />
    );
  }

  if (isStockBackground(value)) {
    return (
      <picture>
        <source
          media="(max-width: 768px)"
          srcSet={stockSrc(value, "mobile")}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stockSrc(value, "desktop")}
          alt={alt}
          className={`h-full w-full object-cover ${className}`}
        />
      </picture>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={value}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
