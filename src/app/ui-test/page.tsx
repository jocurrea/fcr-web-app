import { LicenseModal } from "@/components/profile/license-modal";
import { FlightsModal } from "@/components/profile/flights-modal";
import { ContactModal } from "@/components/profile/contact-modal";
import { PersonalInfoModal } from "@/components/profile/personal-info-modal";

export default function UITestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Flight Crew UI Sandbox</h1>
          <p className="text-muted-foreground">
            Entorno aislado para maquetar modales y probar sanitización de inputs (QA Fixes).
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">1. Modal de Licencia</h2>
              <p className="text-sm text-muted-foreground">Prueba la validación estricta numérica en Nro de licencia.</p>
            </div>
            <LicenseModal />
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">2. Modal de Horas de Vuelo</h2>
              <p className="text-sm text-muted-foreground">Total flight hours: Solo enteros positivos permitidos.</p>
            </div>
            <FlightsModal />
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">3. Modal de Contacto</h2>
              <p className="text-sm text-muted-foreground">Validación de teléfono, correo y listado de países (incluyendo Venezuela).</p>
            </div>
            <ContactModal />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-xl font-semibold">4. Modal de Información Personal</h2>
              <p className="text-sm text-muted-foreground">Validación de Children y corrección de espacio visual en Selectores.</p>
            </div>
            <PersonalInfoModal />
          </div>
        </div>
      </div>
    </div>
  );
}
