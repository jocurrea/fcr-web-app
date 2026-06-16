"use client";

import { useRouter } from "next/navigation";
import { Shield, ChevronLeft, Calendar } from "lucide-react";

export default function CommunitySafetyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center font-sans text-[#374151]">
      
      {/* Header */}
      <div className="w-full bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-center relative shadow-sm">
        <button 
          onClick={() => router.back()}
          className="absolute left-4 md:left-8 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>

        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#111827] rounded-[6px] flex items-center justify-center">
              <Shield className="w-[14px] h-[14px] text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[#111827] text-[17px]">Flight Crew</span>
          </div>
          <span className="text-[13px] text-gray-500 mt-0.5">Safety Standards & Community Guidelines</span>
        </div>
      </div>

      {/* Main Document Content */}
      <div className="w-full max-w-[850px] bg-white border border-gray-200 rounded-xl my-10 p-10 md:p-16 shadow-sm text-[15px] leading-relaxed">
        
        <h1 className="text-3xl md:text-[34px] font-bold text-[#111827] leading-tight mb-4 tracking-tight">
          Flight Crew Ranked – Safety Standards & Community Guidelines
        </h1>
        
        <div className="flex items-center gap-2 text-gray-500 mb-10 text-[13px]">
          <Calendar className="w-4 h-4" />
          <span>Last Updated: March 2026</span>
        </div>

        <div className="space-y-8">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">1. Introduction</h2>
            <p className="mb-4">
              These Safety Standards and Community Guidelines apply to the mobile application Flight Crew 
              Ranked (com.flightcrew.app) and all related services operated by FLIGHT CREW RANKED LLC.
            </p>
            <p className="mb-4">
              Flight Crew Ranked is a professional social platform designed for pilots, flight crew members, 
              aviation professionals, and aviation enthusiasts. Our goal is to create a respectful, professional, 
              and safe environment for aviation professionals to connect, share experiences, and build their 
              professional network.
            </p>
            <p>
              Because Flight Crew Ranked allows user-generated content, we maintain strict safety standards to 
              protect users and ensure compliance with global safety laws and Google Play policies.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">2. Eligibility & Age Requirements</h2>
            <p className="mb-3">Flight Crew Ranked is intended only for adults.</p>
            <p className="font-bold text-[#111827] mb-2">Requirements:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Users must be at least 18 years old to create an account or use the platform.</li>
              <li>Users under the age of 18 are strictly prohibited from accessing or using the service.</li>
              <li>We do not knowingly allow minors on the platform.</li>
              <li>If we discover an account belonging to a minor, the account will be immediately removed.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">3. Community Behavior Standards</h2>
            <p className="mb-4">All users are expected to behave respectfully and professionally.</p>
            
            <p className="font-bold text-[#111827] mb-2">Allowed Behavior</p>
            <p className="mb-2">Examples of acceptable use include:</p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>Professional aviation discussions</li>
              <li>Sharing aviation experiences and knowledge</li>
              <li>Networking with aviation professionals</li>
              <li>Constructive feedback and respectful debate</li>
            </ul>

            <p className="font-bold text-[#111827] mb-2">Prohibited Behavior</p>
            <p className="mb-2">The following activities are strictly prohibited:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Harassment, bullying, intimidation, or threats</li>
              <li>Hate speech or discrimination based on race, gender, religion, nationality, disability, or sexual orientation</li>
              <li>Impersonating another person or organization</li>
              <li>Posting misleading or harmful misinformation</li>
              <li>Spam, scams, or fraudulent activities</li>
              <li>Unauthorized advertising or promotions</li>
            </ul>
            <p>Violations may result in content removal or account suspension.</p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">4. User-Generated Content Rules</h2>
            <p className="mb-4">Users are responsible for the content they publish on the platform.</p>
            <p className="mb-2">Content shared on Flight Crew Ranked must not include:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Pornographic or sexually explicit content</li>
              <li>Violent or graphic material</li>
              <li>Content encouraging illegal activity</li>
              <li>Private or confidential information of others without consent</li>
              <li>Any content that violates applicable laws or regulations</li>
            </ul>
            <p>Flight Crew Ranked reserves the right to remove content or restrict accounts that violate these guidelines.</p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">5. Reporting, Blocking & Safety Tools</h2>
            <p className="mb-4">To maintain a safe environment, the platform provides safety tools.</p>
            
            <p className="font-bold text-[#111827] mb-2">Users can:</p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>Report posts</li>
              <li>Report comments</li>
              <li>Report user profiles</li>
              <li>Report child safety concerns</li>
              <li>Block other users</li>
              <li>Remove their own posts</li>
            </ul>

            <p className="font-bold text-[#111827] mb-2">Reporting Process</p>
            <p className="mb-2">When content is reported:</p>
            <ol className="list-decimal pl-6 space-y-2 mb-6">
              <li>The report is reviewed by the moderation team.</li>
              <li>Moderators evaluate whether the content violates platform policies.</li>
              <li>If a violation is confirmed, appropriate enforcement actions are applied.</li>
            </ol>

            <p className="font-bold text-[#111827] mb-2">Possible actions include:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Content removal</li>
              <li>Account warning</li>
              <li>Temporary suspension</li>
              <li>Permanent account ban</li>
            </ul>
            <p>Reports involving child safety concerns are prioritized and escalated immediately.</p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">6. Moderation & Enforcement</h2>
            <p className="mb-4">Flight Crew Ranked maintains active moderation of user-generated content.</p>
            
            <p className="font-bold text-[#111827] mb-2">Moderation methods include:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>User reports</li>
              <li>Manual content review by moderators</li>
              <li>Automated detection tools (when applicable)</li>
            </ul>
            <p>Moderators may take enforcement action when content or behavior violates these guidelines or poses a safety risk to users.</p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">7. Child Safety & Zero-Tolerance Policy on CSAE</h2>
            <p className="mb-4">
              Flight Crew Ranked maintains a <span className="font-bold text-[#111827]">zero-tolerance policy</span> toward 
              Child Sexual Abuse and Exploitation (CSAE).
            </p>
            <p className="mb-4">
              Any content or behavior related to the sexual exploitation or abuse of minors is strictly prohibited.
            </p>
            
            <p className="font-bold text-[#111827] mb-2">Prohibited Content and Behavior</p>
            <p className="mb-2">The following activities are strictly forbidden:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Child Sexual Abuse Material (CSAM)</li>
              <li>Any sexual content involving minors</li>
              <li>Grooming behavior targeting minors</li>
              <li>Sexualization of minors</li>
              <li>Sextortion of minors</li>
              <li>Child trafficking or exploitation</li>
              <li>Attempts to solicit sexual content from minors</li>
              <li>Any activity that endangers a child</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">8. Enforcement of Child Safety Violations</h2>
            <p className="mb-2">If CSAE or CSAM is identified on the platform:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>The content will be immediately removed</li>
              <li>The account will be permanently terminated</li>
              <li>The incident may be reported to relevant authorities</li>
            </ul>

            <p className="mb-2">Flight Crew Ranked complies with applicable reporting obligations and may report violations to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>National Center for Missing & Exploited Children (NCMEC)</li>
              <li>Law enforcement authorities</li>
              <li>Other relevant regional child protection agencies</li>
            </ul>
            <p>Flight Crew Ranked cooperates fully with law enforcement investigations involving child exploitation.</p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">9. How to Report Child Safety Concerns</h2>
            <p className="mb-4">
              If you encounter content or behavior that may involve child exploitation or child endangerment, 
              please report it immediately.
            </p>
            <p className="font-bold text-[#111827] mb-4">You may report concerns by:</p>
            
            <p className="font-bold text-[#111827] mb-1">Option 1 — In-App Reporting</p>
            <p className="mb-4">Use the in-app reporting feature and select the <span className="font-bold text-[#111827]">Child Safety</span> category.</p>

            <p className="font-bold text-[#111827] mb-1">Option 2 — Direct Email</p>
            <p className="mb-2">Contact our Child Safety team directly:</p>
            <p className="mb-1">Child Safety Contact Email:</p>
            <a href="mailto:contact@flightcrewranked.com" className="text-blue-600 hover:underline mb-4 inline-block">
              contact@flightcrewranked.com
            </a>
            
            <p className="mt-2">All child safety reports are treated as high priority.</p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">10. Child Safety Point of Contact</h2>
            <p className="mb-4">
              Flight Crew Ranked has designated a Child Safety Point of Contact responsible for handling reports 
              related to child sexual abuse and exploitation.
            </p>
            <p className="font-bold text-[#111827] mb-1">Child Safety Contact Email:</p>
            <a href="mailto:contact@flightcrewranked.com" className="text-blue-600 hover:underline mb-4 inline-block">
              contact@flightcrewranked.com
            </a>
            <p className="mb-2">This contact is authorized to respond to inquiries from:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Users</li>
              <li>Google Play</li>
              <li>Child safety organizations</li>
              <li>Law enforcement authorities</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">11. Privacy & Data Protection</h2>
            <p className="mb-4">Flight Crew Ranked takes user privacy seriously.</p>
            <p className="font-bold text-[#111827] mb-2">We:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Securely handle personal information</li>
              <li>Use encryption for data in transit</li>
              <li>Limit access to user data</li>
              <li>Do not sell personal data to third parties</li>
            </ul>
            <p>
              For more details, please review our Privacy Policy: <br />
              <a href="https://flightcrew.netlify.app/privacy-policy" className="text-blue-600 hover:underline">https://flightcrew.netlify.app/privacy-policy</a>
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">12. Account Suspension or Termination</h2>
            <p className="mb-2">Accounts may be suspended or permanently terminated if a user:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Violates these Safety Standards</li>
              <li>Engages in abusive or illegal behavior</li>
              <li>Attempts to exploit other users</li>
              <li>Posts prohibited content</li>
            </ul>
            <p>Users may also request deletion of their account and associated data at any time.</p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">13. Compliance with Child Safety Laws</h2>
            <p className="mb-4">Flight Crew Ranked complies with applicable child protection laws and reporting obligations.</p>
            <p>We maintain processes to detect, remove, and report illegal content involving minors.</p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">14. Updates to These Guidelines</h2>
            <p className="mb-4">These Safety Standards may be updated periodically.</p>
            <p className="mb-4">Updates will be published on this page.</p>
            <p>Continued use of Flight Crew Ranked indicates acceptance of the updated guidelines.</p>
          </section>

          {/* Section 15 */}
          <section className="pb-8">
            <h2 className="text-[20px] font-bold text-[#111827] mb-3">15. Contact Information</h2>
            <p className="mb-6">If you have questions, safety concerns, or reports, please contact us.</p>
            
            <p className="font-bold text-[#111827] mb-1">Developer / Company Name</p>
            <p className="mb-4">FLIGHT CREW RANKED LLC</p>

            <p className="font-bold text-[#111827] mb-1">Support Email</p>
            <a href="mailto:contact@flightcrewranked.com" className="text-blue-600 hover:underline mb-4 inline-block">contact@flightcrewranked.com</a>

            <p className="font-bold text-[#111827] mb-1">Child Safety Contact</p>
            <a href="mailto:contact@flightcrewranked.com" className="text-blue-600 hover:underline mb-4 inline-block">contact@flightcrewranked.com</a>

            <p className="font-bold text-[#111827] mb-1">Business Address</p>
            <p className="mb-4 leading-relaxed">
              15555 Tradesman Ste 400<br />
              San Antonio, Texas 78249<br />
              United States
            </p>

            <p className="font-bold text-[#111827] mb-1">Response Time</p>
            <p className="mb-6">Within 24 hours</p>

            <p className="font-bold text-[#111827]">
              By using Flight Crew Ranked, you agree to follow these Safety Standards and Community Guidelines.
            </p>
          </section>

        </div>
      </div>
      
      {/* Footer */}
      <div className="w-full text-center pb-8 text-[12px] text-gray-500">
        © 2026 Flight Crew. All rights reserved.
      </div>
    </div>
  );
}
