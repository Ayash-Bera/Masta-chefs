"use client"

import { useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"

type NavigateOptions = {
  /**
   * Prefetch the route before navigating. If you already prefetch via pointer events,
   * you can disable this to avoid duplicate work.
   */
  prefetch?: boolean
}

export function useInstantNavigation() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const prefetch = useCallback(
    (href: string) => {
      // `router.prefetch` is only available in the browser environment
      try {
        router.prefetch?.(href)
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to prefetch route", href, err)
        }
      }
    },
    [router]
  )

  const navigate = useCallback(
    (href: string, options: NavigateOptions = {}) => {
      if (options.prefetch !== false) {
        prefetch(href)
      }

      startTransition(() => {
        router.push(href)
      })
    },
    [prefetch, router]
  )

  const replace = useCallback(
    (href: string, options: NavigateOptions = {}) => {
      if (options.prefetch !== false) {
        prefetch(href)
      }

      startTransition(() => {
        router.replace(href)
      })
    },
    [prefetch, router]
  )

  return {
    navigate,
    replace,
    prefetch,
    isNavigating: isPending,
  }
}
