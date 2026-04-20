"use client";

import { useState, useEffect } from "react";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  
  // Must be a valid URL format
  try {
    const urlObj = new URL(url);
    const allowedProtocols = new Set(["http:", "https:", "data:"]);
    return allowedProtocols.has(urlObj.protocol);
  } catch {
    // Not a valid URL
    return false;
  }
}

export function Avatar({ src, name = "?", size = "md", className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setImgError(false);
    setIsLoading(false);
  }, [src]);

  // Only render img if URL is valid
  const isValidUrl = isValidImageUrl(src);
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  if (!isValidUrl || imgError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-primary/20 flex items-center justify-center ${className}`}>
        <span className="text-primary font-medium">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={src ?? undefined}
      alt={name}
      loading="lazy"
      onLoad={() => setIsLoading(false)}
      onError={() => {
        setImgError(true);
        setIsLoading(false);
      }}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
    />
  );
}

export function AvatarWithFallback({ src, name, size = "md", className = "" }: AvatarProps) {
  return <Avatar src={src} name={name} size={size} className={className} />;
}

// Legacy export for compatibility
export default Avatar;
