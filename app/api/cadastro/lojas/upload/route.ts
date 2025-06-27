import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

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

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use arquivos Excel (.xlsx ou .xls)' },
        { status: 400 }
      )
    }

    const buffer = new Uint8Array(await file.arrayBuffer())
    const processedLojas = await processLojasExcel(buffer)

    if (!processedLojas || processedLojas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma loja encontrada no arquivo. Verifique o formato.' },
        { status: 400 }
      )
    }

    const batchSize = 100
    const insertedLojas: any[] = []

    for (let i = 0; i < processedLojas.length; i += batchSize) {
      const batch = processedLojas.slice(i, i + batchSize)

      const { data: lojas, error } = await supabaseAdmin
        .from('colhetron_lojas')
        .upsert(batch, { 
          onConflict: 'prefixo',
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

  const columnMap = {
    'PREFIXO': 'prefixo',
    'NOME': 'nome',
    'Tipo': 'tipo',
    'UF': 'uf',
    'CENTRO': 'centro',
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

  const requiredFields = ['prefixo', 'nome', 'uf']
  const missingFields = requiredFields.filter(field => !headerIndexes[field])

  if (missingFields.length > 0) {
    throw new Error(`Colunas obrigatórias não encontradas: ${missingFields.join(', ')}`)
  }

  const processedLojas: any[] = []

  rows.forEach((row, rowIndex) => {
    if (!row || row.every(cell => !cell)) return

    const loja: any = {}

    Object.entries(headerIndexes).forEach(([field, colIndex]) => {
      const value = row[colIndex]
      
      if (value !== undefined && value !== null && value !== '') {
        if (field === 'ordemSeco' || field === 'ordemFrio') {
          loja[field] = Number(value) || 0
        } else {
          loja[field] = String(value).trim()
        }
      } else {
        if (field === 'ordemSeco' || field === 'ordemFrio') {
          loja[field] = 0
        } else if (['centro', 'zonaSeco', 'subzonaSeco', 'zonaFrio'].includes(field)) {
          loja[field] = ''
        }
      }
    })

    if (loja.prefixo && loja.nome && loja.uf) {
      const validTypes = ['CD', 'Loja Padrão', 'Administrativo']
      if (loja.tipo && !validTypes.includes(loja.tipo)) {
        loja.tipo = 'Loja Padrão'
      }

      processedLojas.push(loja)
    }
  })

  return processedLojas
}