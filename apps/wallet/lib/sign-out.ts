import { logout } from '@/app/actions/auth'
import { clearCachedAccountData } from './offline-queue'

/** 登出：先清掉這台裝置快取的帳務資料 */
export async function signOut() {
  await clearCachedAccountData()
  await logout()
}
