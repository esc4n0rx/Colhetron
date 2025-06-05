// app/api/cadastro/lojas/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Apenas arquivos .xlsx são aceitos' },
        { status: 400 }
      )
    }

    // Processar arquivo Excel
    const fileBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(fileBuffer)
    
    let processedLojas: any[]
    try {
      processedLojas = await processLojasExcel(uint8Array)
    } catch (error) {
      console.error('Erro ao processar Excel:', error)
      return NextResponse.json(
        { error: 'Erro ao processar arquivo Excel. Verifique o formato.' },
        { status: 400 }
      )
    }

    if (processedLojas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma loja encontrada no arquivo' },
        { status: 400 }
      )
    }

    // Inserir lojas em lotes
    const batchSize = 100
    const insertedLojas: any[] = []

    for (let i = 0; i < processedLojas.length; i += batchSize) {
      const batch = processedLojas.slice(i, i + batchSize).map(loja => ({
        ...loja,
        user_id: decoded.userId
      }))

      const { data: lojas, error } = await supabaseAdmin
        .from('colhetron_lojas')
        .upsert(batch, { 
          onConflict: 'user_id,prefixo',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error('Erro ao inserir lojas:', error)
        return NextResponse.json(
          { error: 'Erro ao salvar lojas no banco de dados' },
          { status: 500 }
        )
      }

      if (lojas) {
        insertedLojas.push(...lojas)
      }
    }

    return NextResponse.json({
      message: 'Lojas importadas com sucesso',
      count: insertedLojas.length
    })

  } catch (error) {
    console.error('Erro no upload de lojas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processLojasExcel(buffer: Uint8Array): Promise<any[]> {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  if (!worksheet) {
    throw new Error('Planilha não encontrada')
  }

  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  
  if (data.length < 2) {
    throw new Error('Arquivo deve conter pelo menos cabeçalho e uma linha de dados')
  }

  const headers = data[0] as string[]
  const rows = data.slice(1) as any[][]

  // Mapear colunas esperadas
  const columnMap = {
    'PREFIXO': 'prefixo',
    'NOME': 'nome',
    'Tipo': 'tipo',
    'UF': 'uf',
    'ZONA SECO': 'zonaSeco',
    'SUBZONA SECO': 'subzonaSeco',
    'ZONA FRIO': 'zonaFrio',
    'ORDEM SECO': 'ordemSeco',
    'ORDEM FRIO': 'ordemFrio'
  }

  const headerIndexes: { [key: string]: number } = {}
  headers.forEach((header, index) => {
    const mappedField = columnMap[header as keyof typeof columnMap]
    if (mappedField) {
      headerIndexes[mappedField] = index
    }
  })

  // Verificar colunas obrigatórias
  const requiredFields = ['prefixo', 'nome', 'uf']
  const missingFields = requiredFields.filter(field => !(field in headerIndexes))
  
  if (missingFields.length > 0) {
    throw new Error(`Colunas obrigatórias não encontradas: ${missingFields.join(', ')}`)
  }

  const processedLojas: any[] = []

  for (const row of rows) {
    if (!row || row.length === 0) continue

    const prefixo = row[headerIndexes.prefixo]?.toString()?.trim()
    const nome = row[headerIndexes.nome]?.toString()?.trim()
    const uf = row[headerIndexes.uf]?.toString()?.trim()

    if (!prefixo || !nome || !uf) continue

    const loja = {
      prefixo,
      nome,
      tipo: row[headerIndexes.tipo]?.toString()?.trim() || 'CD',
      uf,
      zonaSeco: row[headerIndexes.zonaSeco]?.toString()?.trim() || '',
      subzonaSeco: row[headerIndexes.subzonaSeco]?.toString()?.trim() || '',
      zonaFrio: row[headerIndexes.zonaFrio]?.toString()?.trim() || '',
      ordemSeco: parseInt(row[headerIndexes.ordemSeco]) || 0,
      ordemFrio: parseInt(row[headerIndexes.ordemFrio]) || 0
    }

    processedLojas.push(loja)
  }

  return processedLojas
}