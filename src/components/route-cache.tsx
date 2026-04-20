"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type RouteCacheContextValue = {
  scope: string;
  path: string;
  isActive: boolean;
};

const RouteCacheContext = createContext<RouteCacheContextValue | null>(null);

export function useRouteCacheState() {
  return useContext(RouteCacheContext);
}

export function useRouteCacheActive(defaultValue = true) {
  return useRouteCacheState()?.isActive ?? defaultValue;
}

export function RouteCache({
  children,
  scope,
}: {
  children: React.ReactNode;
  scope: string;
}) {
  const pathname = usePathname();
  const cacheKey = `${scope}:${pathname}`;
  const [maxEntries, setMaxEntries] = useState(12);
  const [cachedPaths, setCachedPaths] = useState<string[]>([cacheKey]);
  const [cachedChildren, setCachedChildren] = useState<Record<string, React.ReactNode>>({
    [cacheKey]: children,
  });

  useEffect(() => {
    const resolveMaxEntries = () => {
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
      const isMobileAgent = /android|iphone|ipad|ipod|mobile/.test(userAgent);
      const isNarrowViewport = typeof window !== "undefined" ? window.innerWidth < 1024 : false;
      setMaxEntries(isMobileAgent || isNarrowViewport ? 4 : 12);
    };

    resolveMaxEntries();
    window.addEventListener("resize", resolveMaxEntries);

    return () => {
      window.removeEventListener("resize", resolveMaxEntries);
    };
  }, []);

  useEffect(() => {
    setCachedPaths((prev) => {
      const withoutCurrent = prev.filter((path) => path !== cacheKey);
      const nextPaths = [...withoutCurrent, cacheKey];

      if (nextPaths.length <= maxEntries) {
        return nextPaths;
      }

      return nextPaths.slice(nextPaths.length - maxEntries);
    });
    setCachedChildren((prev) => {
      if (prev[cacheKey]) {
        return prev;
      }

      return {
        ...prev,
        [cacheKey]: children,
      };
    });
  }, [cacheKey, children, maxEntries]);

  useEffect(() => {
    const allowedPaths = new Set(cachedPaths.slice(-maxEntries));

    setCachedChildren((prev) => {
      const nextChildren = { ...prev };

      Object.keys(nextChildren).forEach((path) => {
        if (!allowedPaths.has(path)) {
          delete nextChildren[path];
        }
      });

      return nextChildren;
    });
  }, [cachedPaths, maxEntries]);

  return (
    <div className="relative">
      {cachedPaths.map((path) => {
        const isActive = path === cacheKey;
        const contextValue = {
          scope,
          path,
          isActive,
        };

        return (
          <RouteCacheContext.Provider key={path} value={contextValue}>
            <section
              className={isActive ? "block" : "hidden"}
              aria-hidden={isActive ? undefined : true}
              data-route-cache-path={path}
              data-route-cache-active={isActive ? "true" : "false"}
            >
              {isActive ? children : cachedChildren[path] ?? null}
            </section>
          </RouteCacheContext.Provider>
        );
      })}
    </div>
  );
}
