// components/pages/PerfilPage.tsx - Atualização das funções principais
"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Save, 
  Camera, 
  CheckCircle,
  Upload,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface PerfilPageProps {
  onBack: () => void
}

interface UserProfile {
  name: string
  email: string
  phone: string
  department: string
  position: string
  bio: string
  location: string
  avatar_url?: string
}

export default function PerfilPage({ onBack }: PerfilPageProps) {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    department: "Logística",
    position: "Operador de Separação",
    bio: "",
    location: "",
    avatar_url: "/api/storage/avatar/default.png"
  })

  // Carregar perfil do usuário
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) return

      const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const profileData = await response.json()
        setProfile({
          ...profileData,
          email: user?.email || profileData.email
        })
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const token = localStorage.getItem('colhetron_token')
      if (!token) return

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      })

      if (response.ok) {
        setIsEditing(false)
        setSaveSuccess(true)
        toast.success('Perfil atualizado com sucesso!')
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar perfil')
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingAvatar(true)
      const token = localStorage.getItem('colhetron_token')
      if (!token) return

      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setProfile(prev => ({ ...prev, avatar_url: result.avatar_url }))
        toast.success('Avatar atualizado com sucesso!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao fazer upload do avatar')
      }
    } catch (error) {
      console.error('Erro no upload do avatar:', error)
      toast.error('Erro ao fazer upload do avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Toast de Sucesso */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Perfil atualizado com sucesso!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-white apple-font">Meu Perfil</h1>
          </div>

          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <User className="w-4 h-4 mr-2" />
                Editar Perfil
              </Button>
            )}
          </div>
        </motion.div>

        {/* Perfil Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white apple-font flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      <AvatarImage
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                        {profile.name?.charAt(0) || user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <div className="absolute -bottom-2 -right-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <label htmlFor="avatar-upload">
                          <Button
                            size="sm"
                            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
                            disabled={isUploadingAvatar}
                          >
                            {isUploadingAvatar ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{profile.name}</h3>
                    <p className="text-gray-400">{profile.position}</p>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mt-1">
                      <Shield className="w-3 h-3 mr-1" />
                      {user?.role || 'Usuário'}
                    </Badge>
                  </div>
                </div>

                {/* Formulário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Nome Completo</Label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      value={profile.email}
                      disabled={true}
                      className="bg-gray-800 border-gray-700 text-white opacity-50"
                      type="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Telefone</Label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Localização</Label>
                    <Input
                      value={profile.location}
                      onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Departamento</Label>
                    <Input
                      value={profile.department}
                      onChange={(e) => setProfile(prev => ({ ...prev, department: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Cargo</Label>
                    <Input
                      value={profile.position}
                      onChange={(e) => setProfile(prev => ({ ...prev, position: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Biografia</Label>
                  <Textarea
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-gray-800 border-gray-700 text-white disabled:opacity-50 min-h-[80px]"
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar com informações da conta */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white apple-font flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Informações da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Membro desde</span>
                  <span className="text-white">
                    {new Date(user?.created_at || '').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Último acesso</span>
                  <span className="text-white">Hoje às 14:30</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Tipo de conta</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {user?.role || 'Usuário'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}