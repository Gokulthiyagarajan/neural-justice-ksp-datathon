/**
 * Unauthorized — display when user lacks the required role for a page.
 */
import { ShieldAlert } from 'lucide-react'

interface UnauthorizedProps {
  message?: string
}

export function Unauthorized({ message = 'You do not have the required permissions to view this page. Please contact your supervisor if you believe this is incorrect.' }: UnauthorizedProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
        <ShieldAlert size={32} className="text-red-400" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-text-primary">Access Restricted</h2>
        <p className="text-sm text-text-secondary mt-1 max-w-md">{message}</p>
      </div>
    </div>
  )
}
