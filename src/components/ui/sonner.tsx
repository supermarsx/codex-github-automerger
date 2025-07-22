import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group neo-card group-[.toaster]:shadow-[4px_4px_0px_0px_hsl(var(--foreground)/0.5)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:neo-button",
          cancelButton:
            "group-[.toast]:neo-button-secondary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
