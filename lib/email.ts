// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendRecoveryEmailProps {
  email: string
  code: string
  name?: string
}

export async function sendRecoveryEmail({ email, code, name }: SendRecoveryEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Colhetron <noreply@colhetron.com>',
      to: [email],
      subject: 'Recuperação de Senha - Colhetron',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperação de Senha</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Colhetron</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">Sistema de Gestão</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <h2 style="color: #333; margin-bottom: 20px;">Recuperação de Senha</h2>
            
            <p>Olá${name ? ` ${name}` : ''},</p>
            
            <p>Você solicitou a recuperação de senha para sua conta. Use o código abaixo para criar uma nova senha:</p>
            
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #667eea; margin: 0; font-size: 32px; letter-spacing: 8px; font-weight: bold;">${code}</h3>
            </div>
            
            <p><strong>Instruções:</strong></p>
            <ol>
              <li>Acesse a página de recuperação de senha</li>
              <li>Digite seu email e o código acima</li>
              <li>Crie uma nova senha segura</li>
            </ol>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;"><strong>⚠️ Importante:</strong></p>
              <ul style="color: #856404; margin: 10px 0 0 0;">
                <li>Este código expira em <strong>15 minutos</strong></li>
                <li>Se você não solicitou este código, ignore este email</li>
                <li>Nunca compartilhe este código com terceiros</li>
              </ul>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              Este é um email automático. Por favor, não responda.<br>
              © 2024 Colhetron. Todos os direitos reservados.
            </p>
          </div>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('Erro ao enviar email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return { success: false, error: 'Erro interno ao enviar email' }
  }
}

export function generateRecoveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}