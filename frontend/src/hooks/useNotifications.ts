import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { NotificationPreferences } from '@/types'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function useNotifications() {
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission as PermissionState
  })
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    blockTransition: true,
    habitReminder: true,
    sleepWarning: true,
    dailyReview: true,
  })
  const [prefsLoading, setPrefsLoading] = useState(true)

  useEffect(() => {
    checkExistingSubscription()
    fetchPreferences()
  }, [])

  const checkExistingSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker?.ready
      const sub = await reg?.pushManager?.getSubscription()
      setSubscribed(!!sub)
    } catch {
      setSubscribed(false)
    }
  }

  const fetchPreferences = async () => {
    try {
      const res = await api.get<NotificationPreferences>(API_ENDPOINTS.NOTIFICATION_PREFERENCES)
      setPreferences(res.data)
    } catch {
      // keep defaults
    } finally {
      setPrefsLoading(false)
    }
  }

  const subscribe = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    setLoading(true)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm as PermissionState)
      if (perm !== 'granted') return

      const keyRes = await api.get<{ publicKey: string }>(API_ENDPOINTS.VAPID_PUBLIC_KEY)
      const applicationServerKey = urlBase64ToUint8Array(keyRes.data.publicKey)

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // @ts-ignore: TS DOM BufferSource vs ArrayBufferLike mismatch
        applicationServerKey: applicationServerKey as unknown as Uint8Array,
      })

      const json = sub.toJSON()
      await api.post(API_ENDPOINTS.NOTIFICATION_SUBSCRIBE, {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      })

      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.post(API_ENDPOINTS.NOTIFICATION_UNSUBSCRIBE, {
          endpoint: sub.endpoint,
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePreferences = useCallback(async (updated: NotificationPreferences) => {
    setPreferences(updated)
    try {
      const res = await api.put<NotificationPreferences>(API_ENDPOINTS.NOTIFICATION_PREFERENCES, updated)
      setPreferences(res.data)
    } catch {
      fetchPreferences()
    }
  }, [])

  const sendTest = useCallback(async () => {
    await api.post(API_ENDPOINTS.NOTIFICATION_TEST)
  }, [])

  return {
    permission,
    subscribed,
    loading,
    preferences,
    prefsLoading,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTest,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as any
}
