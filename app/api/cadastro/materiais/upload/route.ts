// app/api/cadastro/materiais/upload/route.ts
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
    
    let processedMateriais: any[]
    try {
      processedMateriais = await processMateriaisExcel(uint8Array)
    } catch (error) {
      console.error('Erro ao processar Excel:', error)
      return NextResponse.json(
        { error: 'Erro ao processar arquivo Excel. Verifique o formato.' },
        { status: 400 }
      )
    }

    if (processedMateriais.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum material encontrado no arquivo' },
        { status: 400 }
      )
    }

    // Inserir materiais em lotes
    const batchSize = 100
    const insertedMateriais: any[] = []

    for (let i = 0; i < processedMateriais.length; i += batchSize) {
      const batch = processedMateriais.slice(i, i + batchSize).map(material => ({
        ...material,
        user_id: decoded.userId
      }))

      const { data: materiais, error } = await supabaseAdmin
        .from('colhetron_materiais')
        .upsert(batch, { 
          onConflict: 'user_id,material',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error('Erro ao inserir materiais:', error)
        return NextResponse.json(
          { error: 'Erro ao salvar materiais no banco de dados' },
          { status: 500 }
        )
      }

      if (materiais) {
        insertedMateriais.push(...materiais)
      }
    }

    return NextResponse.json({
      message: 'Materiais importados com sucesso',
      count: insertedMateriais.length
    })

  } catch (error) {
    console.error('Erro no upload de materiais:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



async function processMateriaisExcel(buffer: Uint8Array): Promise<any[]> {
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

  console.log('Headers encontrados:', headers) // Debug

  // Mapear colunas com múltiplas variações possíveis
  const columnMap = {
    // Variações para MATERIAL
    'MATERIAL': 'material',
    'Material': 'material',
    'material': 'material',
    'CODIGO': 'material',
    'Codigo': 'material',
    'codigo': 'material',
    
    // Variações para DESCRIÇÃO
    'DESCRIÇÃO': 'descricao',
    'DESCRICAO': 'descricao',
    'Descrição': 'descricao',
    'Descricao': 'descricao',
    'descrição': 'descricao',
    'descricao': 'descricao',
    'DESCRIPTION': 'descricao',
    'Description': 'descricao',
    
    // Variações para NOTURNO
    'NOTURNO': 'noturno',
    'Noturno': 'noturno',
    'noturno': 'noturno',
    'NIGHT': 'noturno',
    'Night': 'noturno',
    
    // Variações para DIURNO
    'DIURNO': 'diurno',
    'Diurno': 'diurno',
    'diurno': 'diurno',
    'DAY': 'diurno',
    'Day': 'diurno'
  }

  const headerIndexes: { [key: string]: number } = {}
  
  // Fazer mapeamento mais flexível
  headers.forEach((header, index) => {
    const cleanHeader = header?.toString().trim()
    const mappedField = columnMap[cleanHeader as keyof typeof columnMap]
    if (mappedField) {
      headerIndexes[mappedField] = index
    }
  })

  console.log('Mapeamento de colunas:', headerIndexes) // Debug

  // Verificar colunas obrigatórias
  const requiredFields = ['material', 'descricao']
  const missingFields = requiredFields.filter(field => !(field in headerIndexes))
  
  if (missingFields.length > 0) {
    console.log('Colunas disponíveis:', Object.keys(headerIndexes))
    console.log('Headers originais:', headers)
    throw new Error(`Colunas obrigatórias não encontradas: ${missingFields.join(', ')}. Headers encontrados: ${headers.join(', ')}`)
  }

  const processedMateriais: any[] = []

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    if (!row || row.length === 0) continue

    const material = row[headerIndexes.material]?.toString()?.trim()
    const descricao = row[headerIndexes.descricao]?.toString()?.trim()

    if (!material || !descricao) {
      console.log(`Linha ${rowIndex + 2} ignorada: material="${material}", descricao="${descricao}"`)
      continue
    }

    // Valores para noturno e diurno com fallback
    let noturno = 'SECO'
    let diurno = 'SECO'

    if (headerIndexes.noturno !== undefined) {
      const noturnoValue = row[headerIndexes.noturno]?.toString()?.trim().toUpperCase()
      if (noturnoValue === 'FRIO' || noturnoValue === 'SECO') {
        noturno = noturnoValue
      }
    }

    if (headerIndexes.diurno !== undefined) {
      const diurnoValue = row[headerIndexes.diurno]?.toString()?.trim().toUpperCase()
      if (diurnoValue === 'FRIO' || diurnoValue === 'SECO') {
        diurno = diurnoValue
      }
    }

    const materialObj = {
      material,
      descricao,
      noturno,
      diurno
    }

    processedMateriais.push(materialObj)
  }

  console.log(`Processados ${processedMateriais.length} materiais`) // Debug
  return processedMateriais
}