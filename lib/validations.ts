import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
})

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  created_at: z.string(),
  updated_at: z.string()
})

export type LoginData = z.infer<typeof loginSchema>
export type User = z.infer<typeof userSchema>