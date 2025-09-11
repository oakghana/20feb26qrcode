import LoginCredentials from "@/components/admin/login-credentials"

export default function LoginInfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <LoginCredentials />
      </div>
    </div>
  )
}
