import Image from "next/image";

type AuthBrandProps = {
  title: string;
  description: string;
};

export function AuthBrand({ title, description }: AuthBrandProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-xl border bg-background shadow-xs">
        <Image
          src="/flight-crew-logo.png"
          alt="Flight Crew"
          width={44}
          height={44}
          priority
        />
      </div>
      <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
