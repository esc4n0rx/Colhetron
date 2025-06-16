// app/api/cadastro/materiais/upload/route.ts (CORRIGIDO)
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import * as XLSX from 'xlsx'

interface ExcelMaterialRow {
  material?: string | number
  descricao?: string
  categoria?: string
  diurno?: string
  noturno?: string
  [key: string]: any // Para capturar outras colunas
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
    }

    // Verificar extensão do arquivo
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ 
        error: 'Formato de arquivo inválido. Use arquivos Excel (.xlsx ou .xls)' 
      }, { status: 400 })
    }

    // Ler arquivo Excel
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData: ExcelMaterialRow[] = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: ''
    })

    if (!jsonData || jsonData.length < 2) {
      return NextResponse.json({ 
        error: 'Arquivo vazio ou formato inválido. O arquivo deve conter pelo menos um cabeçalho e uma linha de dados.' 
      }, { status: 400 })
    }

    // Processar cabeçalhos de forma flexível
    const headers = jsonData[0] as string[]
    const dataRows = jsonData.slice(1)
    
    console.log('Headers encontrados:', headers)
    console.log('Número de linhas de dados:', dataRows.length)

    // Mapeamento flexível de colunas
    const findColumnIndex = (possibleNames: string[]): number => {
      for (const name of possibleNames) {
        const index = headers.findIndex(header => 
          header && header.toString().toLowerCase().trim() === name.toLowerCase()
        )
        if (index !== -1) return index
      }
      return -1
    }

    const materialIndex = findColumnIndex([
      'material', 'codigo', 'código', 'item', 'product', 'produto'
    ])
    const descricaoIndex = findColumnIndex([
      'descricao', 'descrição', 'description', 'nome', 'name'
    ])
    const categoriaIndex = findColumnIndex([
      'categoria', 'category', 'tipo', 'type'
    ])
    const diurnoIndex = findColumnIndex([
      'diurno', 'day', 'turno_dia', 'categoria_diurno'
    ])
    const noturnoIndex = findColumnIndex([
      'noturno', 'night', 'turno_noite', 'categoria_noturno'
    ])

    console.log('Índices encontrados:', {
      material: materialIndex,
      descricao: descricaoIndex,
      categoria: categoriaIndex,
      diurno: diurnoIndex,
      noturno: noturnoIndex
    })

    // Verificar colunas obrigatórias
    if (materialIndex === -1) {
      return NextResponse.json({ 
        error: `Coluna "material" não encontrada. Headers disponíveis: ${headers.join(', ')}` 
      }, { status: 400 })
    }

    if (descricaoIndex === -1) {
      return NextResponse.json({ 
        error: `Coluna "descrição" não encontrada. Headers disponíveis: ${headers.join(', ')}` 
      }, { status: 400 })
    }

    // Processar dados linha por linha
    const processedMaterials = []
    const errors = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      const rowNumber = i + 2 // +2 porque Excel começa em 1 e temos header

      try {
        // Extrair valores das colunas
        const material = row[materialIndex]?.toString()?.trim()
        const descricao = row[descricaoIndex]?.toString()?.trim()

        // Pular linhas vazias
        if (!material && !descricao) continue

        // Validações básicas
        if (!material) {
          errors.push(`Linha ${rowNumber}: Material é obrigatório`)
          continue
        }
        
        if (!descricao) {
          errors.push(`Linha ${rowNumber}: Descrição é obrigatória`)
          continue
        }

        // Determinar categoria (lógica atualizada para ser mais flexível)
        let categoria = 'SECO' // Valor padrão

        // Prioridade: categoria > diurno > noturno > padrão
        if (categoriaIndex !== -1 && row[categoriaIndex]) {
          categoria = row[categoriaIndex].toString().trim().toUpperCase()
        } else if (diurnoIndex !== -1 && row[diurnoIndex]) {
          categoria = row[diurnoIndex].toString().trim().toUpperCase()
        } else if (noturnoIndex !== -1 && row[noturnoIndex]) {
          categoria = row[noturnoIndex].toString().trim().toUpperCase()
        }

        // Garantir que temos uma categoria válida
        if (!categoria || categoria === '') {
          categoria = 'SECO'
        }

        processedMaterials.push({
          material: material,
          descricao: descricao,
          categoria: categoria,
          user_id: decoded.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      } catch (error) {
        errors.push(`Linha ${rowNumber}: Erro no processamento - ${error}`)
      }
    }

    console.log(`Materiais processados: ${processedMaterials.length}`)
    console.log(`Erros encontrados: ${errors.length}`)

    // Verificar se há dados para processar
    if (processedMaterials.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum material válido encontrado no arquivo',
        details: errors.length > 0 ? errors.slice(0, 10) : ['Verifique se o arquivo contém dados válidos']
      }, { status: 400 })
    }

    // Se houver muitos erros em relação aos dados válidos, alertar
    if (errors.length > processedMaterials.length) {
      return NextResponse.json({ 
        error: `Muitos erros encontrados (${errors.length} erros vs ${processedMaterials.length} materiais válidos)`, 
        details: errors.slice(0, 10) // Primeiros 10 erros
      }, { status: 400 })
    }

    // Verificar duplicatas no banco de dados
    const materialCodes = processedMaterials.map(m => m.material)
    const { data: existingMaterials } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('material')
      .in('material', materialCodes)

    const existingCodes = new Set(existingMaterials?.map(m => m.material) || [])
    
    // Separar materiais novos dos existentes
    const newMaterials = processedMaterials.filter(m => !existingCodes.has(m.material))
    const duplicateMaterials = processedMaterials.filter(m => existingCodes.has(m.material))
    
    console.log(`Materiais novos: ${newMaterials.length}`)
    console.log(`Materiais duplicados: ${duplicateMaterials.length}`)

    // Preparar dados para inserção com nova lógica de categoria
    const materialsToInsert = newMaterials.map(material => ({
      user_id: material.user_id,
      material: material.material,
      descricao: material.descricao,
      diurno: material.categoria,   // Popular coluna diurno com categoria
      noturno: material.categoria,  // Popular coluna noturno com categoria  
      created_at: material.created_at,
      updated_at: material.updated_at
    }))

    // Inserir materiais em lotes
    const batchSize = 100
    let insertedCount = 0
    const insertErrors = []
    
    for (let i = 0; i < materialsToInsert.length; i += batchSize) {
      const batch = materialsToInsert.slice(i, i + batchSize)
      
      try {
        const { data, error: insertError } = await supabaseAdmin
          .from('colhetron_materiais')
          .insert(batch)
          .select()

        if (insertError) {
          console.error('Erro ao inserir lote:', insertError)
          insertErrors.push(`Lote ${Math.floor(i/batchSize) + 1}: ${insertError.message}`)
        } else {
          insertedCount += batch.length
        }
      } catch (batchError) {
        console.error('Erro no lote:', batchError)
        insertErrors.push(`Lote ${Math.floor(i/batchSize) + 1}: Erro inesperado`)
      }
    }

    // Log da atividade
    await logActivity({
      userId: decoded.userId,
      action: 'Upload de materiais',
      details: `Upload realizado: ${insertedCount} materiais inseridos, ${duplicateMaterials.length} duplicados ignorados`,
      type: 'upload',
      metadata: {
        fileName: file.name,
        total_processed: processedMaterials.length,
        inserted: insertedCount,
        duplicates: duplicateMaterials.length,
        processing_errors: errors.length,
        insert_errors: insertErrors.length
      }
    })

    const response: {
      success: boolean
      message: string
      summary: {
        total_linhas: number
        materiais_processados: number
        materiais_inseridos: number
        materiais_duplicados: number
        erros_processamento: number
        erros_insercao: number
      }
      details?: {
        erros_processamento?: string[]
        erros_insercao?: string[]
        duplicados_exemplos?: (string | number)[]
      }
    } = {
      success: true,
      message: 'Upload concluído',
      summary: {
        total_linhas: dataRows.length,
        materiais_processados: processedMaterials.length,
        materiais_inseridos: insertedCount,
        materiais_duplicados: duplicateMaterials.length,
        erros_processamento: errors.length,
        erros_insercao: insertErrors.length
      }
    }

    // Adicionar detalhes se houver problemas
    if (errors.length > 0 || insertErrors.length > 0 || duplicateMaterials.length > 0) {
      response.details = {
        ...(errors.length > 0 && { erros_processamento: errors.slice(0, 5) }),
        ...(insertErrors.length > 0 && { erros_insercao: insertErrors }),
        ...(duplicateMaterials.length > 0 && { 
          duplicados_exemplos: duplicateMaterials.slice(0, 5).map(m => m.material) 
        })
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erro no upload de materiais:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}