import { Award, Globe } from "lucide-react";

export function DoctorProfile() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[#1a2332]">Profile & Settings</h1>
        <p className="text-[#6b7a94] text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Doctor Info */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold flex-shrink-0" style={{ background: "#1565C0" }}>
            AK
          </div>
          <div className="flex-1">
            <h2 className="text-[#1a2332] text-base">Dr. Arjun Kumar</h2>
            <p className="text-[#6b7a94] text-sm mt-0.5">General Physician · MBBS, MD (General Medicine)</p>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-xs text-[#6b7a94] flex items-center gap-1">
                <Award className="w-3 h-3" />12 years experience
              </span>
              <span className="text-xs text-[#6b7a94]">🏥 District Hospital Fatehpur</span>
              <span className="text-xs text-[#6b7a94] flex items-center gap-1">
                <Globe className="w-3 h-3" />Hindi, English, Bhojpuri
              </span>
            </div>
            <p className="text-xs text-[#6b7a94] mt-1">dr.arjun@ruralcarelink.in · +91 98765 43210</p>
          </div>
          <button className="text-xs font-medium px-3 py-1.5 rounded-lg border" style={{ color: "#1565C0", borderColor: "rgba(21,101,192,0.2)" }}>
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
