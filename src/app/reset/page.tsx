"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Borrando datos locales...");

  useEffect(() => {
    // 1. Borrar TODO el almacenamiento local
    localStorage.clear();
    sessionStorage.clear();
    
    // 2. Dar un pequeño retraso para asegurar que el navegador limpie todo
    setTimeout(() => {
      setStatus("Datos borrados con éxito. Redirigiendo...");
      setTimeout(() => {
        router.push("/welcome");
      }, 1500);
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <h1 className="text-xl font-bold text-gray-800">{status}</h1>
      <p className="text-gray-500 text-sm max-w-md text-center">
        Esto limpiará todas las mezclas de credenciales antiguas como las de Jose Urrea. Luego debes crear la cuenta desde cero.
      </p>
    </div>
  );
}
