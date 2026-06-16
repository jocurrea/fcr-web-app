import { cn } from "@/lib/utils";

interface StepperProps {
  steps: number;
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      {Array.from({ length: steps }).map((_, i) => {
        const isActive = i + 1 <= currentStep;
        return (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              isActive ? "bg-blue-600" : "bg-gray-200"
            )}
          />
        );
      })}
    </div>
  );
}
