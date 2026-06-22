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
            Isolated environment to mock modals and test input sanitization (QA Fixes).
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">1. License Modal</h2>
              <p className="text-sm text-muted-foreground">Test strict numeric validation on license number.</p>
            </div>
            <LicenseModal />
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">2. Flight Hours Modal</h2>
              <p className="text-sm text-muted-foreground">Total flight hours: Only positive integers allowed.</p>
            </div>
            <FlightsModal />
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold">3. Contact Modal</h2>
              <p className="text-sm text-muted-foreground">Validation of phone, email, and country list (including Venezuela).</p>
            </div>
            <ContactModal />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-xl font-semibold">4. Personal Info Modal</h2>
              <p className="text-sm text-muted-foreground">Children validation and visual spacing correction on Selectors.</p>
            </div>
            <PersonalInfoModal />
          </div>
        </div>
      </div>
    </div>
  );
}
