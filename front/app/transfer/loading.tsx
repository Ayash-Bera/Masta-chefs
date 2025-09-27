export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
        <div className="h-3 w-3 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  )
}
