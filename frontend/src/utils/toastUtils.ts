import { toast } from 'react-toastify'

export default class ToastUtils {
    static success(message: string): void {
        toast.success(message)
    }
    
    static error(message: string): void {
        toast.error(message)
    }
    
    static info(message: string): void {
        toast.info(message)
    }
    
    static warning(message: string): void {
        toast.warning(message)
    }
}