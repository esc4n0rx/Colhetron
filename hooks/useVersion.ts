// hooks/useVersion.ts
"use client"

import { useState, useEffect } from 'react'

export function useVersion() {
  const [currentVersion, setCurrentVersion] = useState("1.0.0")
  const [isLatest, setIsLatest] = useState(true)
  const [latestVersion, setLatestVersion] = useState("")

  useEffect(() => {
    checkVersion()
  }, [])

  const checkVersion = async () => {
    try {
      const response = await fetch('/api/git/releases')
      const data = await response.json()
      
      if (data.releases && data.releases.length > 0) {
        const latest = data.releases[0].tag_name.replace('v', '')
        setLatestVersion(latest)
        setIsLatest(currentVersion === latest)
      }
    } catch (error) {
      console.error('Erro ao verificar versão:', error)
    }
  }

  return {
    currentVersion,
    latestVersion,
    isLatest,
    checkVersion
  }
}