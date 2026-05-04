import SocSecureUpload from "@/features/soc-upload/SocSecureUpload";

/** SOC ingestion uses a fixed dark SOC skin (cyber-defense console). */
export default function UserUploadPage() {
  return (
    <div className="min-h-0 bg-[#070b14]">
      <SocSecureUpload />
    </div>
  );
}
