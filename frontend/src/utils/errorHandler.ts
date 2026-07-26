import logger from './logger'
import ToastUtils from './toastUtils'
import { ApiError } from '@/api/client'

export default class ErrorHandler {
    static handleError(error: unknown): void {
        if (error instanceof ApiError) {
            logger.error(`API Error: ${error.message} (${error.code})`)
            return
        }
        
        if (error instanceof Error) {
            logger.error(`Error: ${error.message}`)
            return
        }
        
        logger.error('Unknown error occurred')
    }
    
    static handleApiError(error: ApiError): void {
        logger.error(`API Error: ${error.message} (${error.code})`)
    }
    
    static showToast(error: unknown): void {
        if (error instanceof ApiError) {
            ToastUtils.error('Unable to complete the request. Please try again.')
        } else if (error instanceof Error) {
            ToastUtils.error('An unexpected error occurred. Please try again.')
        } else {
            ToastUtils.error('An unknown error occurred. Please try again later.')
        }
    }
}