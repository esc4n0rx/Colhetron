// components/pages/PerfilPage.tsx
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
  Loader2,
  BarChart3,
  Activity,
  Trophy
} from "lucide-react"
import { toast } from "sonner"
import StatisticsTab from "@/components/profile/StatisticsTab"
import ActivitiesTab from "@/components/profile/ActivitiesTab"
import RankingTab from "@/components/profile/RankingTab"

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

const profileTabs = [
  { id: "info", label: "Informações", icon: User },
  { id: "statistics", label: "Estatísticas", icon: BarChart3 },
  { id: "activities", label: "Atividades", icon: Activity },
  { id: "ranking", label: "Ranking", icon: Trophy }
]

export default function PerfilPage({ onBack }: PerfilPageProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("info")
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
    avatar_url: ""
  })

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
        toast.error('Erro ao salvar perfil')
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
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
        toast.error('Erro ao fazer upload do avatar')
      }
    } catch (error) {
      console.error('Erro no upload do avatar:', error)
      toast.error('Erro ao fazer upload do avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Informações Pessoais
                </CardTitle>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span className="ml-2">Salvar</span>
                      </Button>
                      <Button
                        onClick={() => setIsEditing(false)}
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Editar Perfil
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-gray-700 text-white text-2xl">
                      {profile.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <label className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 rounded-full p-2 cursor-pointer transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleAvatarUpload(file)
                        }}
                      />
                    </label>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{profile.name || user?.name}</h3>
                  <p className="text-gray-400">{profile.position}</p>
                  <p className="text-gray-500 text-sm">{profile.department}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled={true}
                    className="bg-gray-800 border-gray-700 text-white opacity-50"
                  />
                  <p className="text-xs text-gray-500">E-mail não pode ser alterado</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="(00) 00000-0000"
                    className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-300">Localização</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Cidade, Estado"
                    className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-gray-300">Departamento</Label>
                  <Input
                    id="department"
                    value={profile.department}
                    onChange={(e) => setProfile(prev => ({ ...prev, department: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-gray-300">Cargo</Label>
                  <Input
                    id="position"
                    value={profile.position}
                    onChange={(e) => setProfile(prev => ({ ...prev, position: e.target.value }))}
                    disabled={!isEditing}
                    className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-300">Biografia</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Conte um pouco sobre você..."
                  className="bg-gray-800 border-gray-700 text-white disabled:opacity-50 min-h-[100px]"
                />
              </div>

              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 text-green-400 bg-green-400/10 border border-green-400/20
                  rounded-lg p-3"
               >
                 <CheckCircle className="w-4 h-4" />
                 <span>Perfil salvo com sucesso!</span>
               </motion.div>
             )}
           </CardContent>
         </Card>
       )

     case "statistics":
       return <StatisticsTab />

     case "activities":
       return <ActivitiesTab />

     case "ranking":
       return <RankingTab />

     default:
       return null
   }
 }

 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.5 }}
     className="space-y-6"
   >
     {/* Header */}
     <div className="flex items-center justify-between">
       <div className="flex items-center space-x-4">
         <Button
           onClick={onBack}
           variant="ghost"
           size="sm"
           className="text-gray-400 hover:text-white"
         >
           <ArrowLeft className="w-4 h-4 mr-2" />
           Voltar
         </Button>
         <div>
           <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
           <p className="text-gray-400">Gerencie suas informações e visualize suas estatísticas</p>
         </div>
       </div>
       <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
         <Shield className="w-3 h-3 mr-1" />
         Verificado
       </Badge>
     </div>

     {/* Tab Navigation */}
     <Card className="bg-gray-900/50 border-gray-800">
       <CardContent className="p-0">
         <div className="flex border-b border-gray-800">
           {profileTabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                 activeTab === tab.id
                   ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5'
                   : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
               }`}
             >
               <tab.icon className="w-4 h-4 mr-2" />
               {tab.label}
             </button>
           ))}
         </div>
       </CardContent>
     </Card>

     {/* Tab Content */}
     <AnimatePresence mode="wait">
       <motion.div
         key={activeTab}
         initial={{ opacity: 0, x: 20 }}
         animate={{ opacity: 1, x: 0 }}
         exit={{ opacity: 0, x: -20 }}
         transition={{ duration: 0.3 }}
       >
         {renderTabContent()}
       </motion.div>
     </AnimatePresence>
   </motion.div>
 )
}