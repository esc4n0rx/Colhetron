"use client"

// Imports do Core do React
import React, { useState, useCallback, useMemo } from 'react';

// Imports de Bibliotecas de Terceiros
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Loader2, Search, Filter, Plus, Upload, AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';

// Imports de Componentes UI (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CategoryCombobox } from '@/components/ui/category-combobox';

// Imports de Hooks Personalizados
import { useCadastroData, LojaItem, MaterialItem } from '@/hooks/useCadastroData';
import { useMaterialCategories } from '@/hooks/useMaterialCategories';

// --- Interfaces de Props --- //

/** Props para o componente EditableCategory. */
interface EditableCategoryProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}

/** Props para o componente de Paginação. */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

/** Props para o componente de Célula Editável. */
interface EditableCellProps {
  value: any;
  onSave: (value: any) => void;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
  disabled?: boolean;
}

/** Props para o Modal de Upload. */
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<{ success: boolean; error?: string }>;
  type: 'lojas' | 'materiais';
}

/** Props para o Modal de Nova Loja. */
interface NovaLojaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loja: Omit<LojaItem, 'id'>) => Promise<{ success: boolean; error?: string }>;
}

/** Props para o Modal de Novo Material. */
interface NovoMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Omit<MaterialItem, 'id'>) => Promise<{ success: boolean; error?: string }>;
}


// --- Componentes Reutilizáveis --- //

/**
 * @description Componente para edição in-loco de uma categoria, utilizando um combobox.
 * @param {EditableCategoryProps} props - As propriedades do componente.
 */
function EditableCategory({ value, onSave, placeholder }: EditableCategoryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Salva o novo valor se ele foi alterado.
  const handleSave = () => {
    if (tempValue.trim() !== value) {
      onSave(tempValue.trim());
    }
    setIsEditing(false);
  };

  // Cancela a edição e reverte para o valor original.
  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  // Modo de visualização
  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="cursor-pointer hover:bg-gray-700 rounded px-2 py-1 min-h-[32px] flex items-center"
      >
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-400/30">
          {value || placeholder || 'N/A'}
        </Badge>
      </div>
    );
  }

  // Modo de edição
  return (
    <div className="flex items-center gap-1">
      <CategoryCombobox
        value={tempValue}
        onValueChange={setTempValue}
        placeholder="Categoria"
        className="h-8 text-sm w-32"
      />
      <Button size="sm" onClick={handleSave} className="h-8 px-2 bg-green-600 hover:bg-green-700">
        ✓
      </Button>
      <Button size="sm" onClick={handleCancel} className="h-8 px-2 bg-red-600 hover:bg-red-700">
        ✗
      </Button>
    </div>
  );
}

/**
 * @description Componente de paginação para navegar entre as páginas de uma tabela.
 * @param {PaginationProps} props - As propriedades do componente.
 */
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 rounded-b-lg border-t border-gray-700">
      <div className="text-sm text-gray-400">
        Mostrando {startItem} a {endItem} de {totalItems} resultados
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>
        <div className="flex items-center gap-1">
          {/* Lógica para renderizar os botões de número de página */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            // Define o número da página a ser exibido com base na página atual
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 p-0 ${
                  currentPage === pageNum
                    ? "bg-blue-600 text-white"
                    : "border-gray-600 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          Próximo
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * @description Componente de célula de tabela que permite edição in-loco.
 * @param {EditableCellProps} props - As propriedades do componente.
 */
function EditableCell({ value, onSave, type = 'text', options, placeholder, disabled = false }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  // Salva o valor editado e sai do modo de edição.
  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  // Cancela a edição, reverte o valor e sai do modo de edição.
  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  // Modo de visualização (para campos não-select ou desabilitados)
  if (disabled || (!isEditing && type !== 'select')) {
    return (
      <div
        onClick={() => !disabled && setIsEditing(true)}
        className={`p-2 rounded cursor-pointer hover:bg-gray-700/50 transition-colors ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        } text-white`}
      >
        {value || placeholder || (type === 'number' ? '0' : '-')}
      </div>
    );
  }

  // Modo de edição para campos do tipo 'select'
  if (type === 'select') {
    return (
      <Select value={value} onValueChange={(newValue) => onSave(newValue)}>
        <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {options?.map(option => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Modo de edição para campos de texto ou número
  return (
    <div className="flex gap-1">
      <Input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(type === 'number' ? Number(e.target.value) : e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        className="bg-gray-800 border-gray-600 text-white h-8 text-sm"
        autoFocus
      />
      <Button size="sm" onClick={handleSave} className="h-8 px-2 bg-green-600 hover:bg-green-700">
        ✓
      </Button>
      <Button size="sm" onClick={handleCancel} className="h-8 px-2 bg-red-600 hover:bg-red-700">
        ✗
      </Button>
    </div>
  );
}

// --- Componente Principal --- //

/**
 * @description Aba principal para o cadastro e gerenciamento de Lojas e Materiais.
 */
export default function CadastroTab() {
  // Estados para controle de UI (filtros, busca, modais, paginação)
  const [searchTermLojas, setSearchTermLojas] = useState("");
  const [searchTermMateriais, setSearchTermMateriais] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroUF, setFiltroUF] = useState("Todos");
  const [filtroTurno, setFiltroTurno] = useState("Todos"); // Estado não utilizado no JSX, mas mantido.
  const [showNovaLojaModal, setShowNovaLojaModal] = useState(false);
  const [showNovoMaterialModal, setShowNovoMaterialModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'lojas' | 'materiais'>('lojas');
  const [currentPageLojas, setCurrentPageLojas] = useState(1);
  const [currentPageMateriais, setCurrentPageMateriais] = useState(1);
  const itemsPerPage = 20;

  // Hooks para gerenciamento de dados
  const {
    lojas,
    materiais,
    isLoading,
    error,
    updateLoja,
    updateMaterial,
    createLoja,
    createMaterial,
    uploadLojas,
    uploadMateriais
  } = useCadastroData();

  const { refreshCategories } = useMaterialCategories();

  // Memoiza a lista de lojas filtrada para evitar recálculos desnecessários
  const filteredLojas = useMemo(() => {
    return lojas.filter(loja => {
      const matchesSearch = searchTermLojas === "" ||
        loja.nome.toLowerCase().includes(searchTermLojas.toLowerCase()) ||
        loja.prefixo.toLowerCase().includes(searchTermLojas.toLowerCase());
      
      const matchesType = filtroTipo === "Todos" || loja.tipo === filtroTipo;
      const matchesUF = filtroUF === "Todos" || loja.uf === filtroUF;
      
      return matchesSearch && matchesType && matchesUF;
    });
  }, [lojas, searchTermLojas, filtroTipo, filtroUF]);

  // Memoiza a paginação das lojas
  const paginatedLojas = useMemo(() => {
    const startIndex = (currentPageLojas - 1) * itemsPerPage;
    return filteredLojas.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLojas, currentPageLojas, itemsPerPage]);

  const totalPagesLojas = Math.ceil(filteredLojas.length / itemsPerPage);

  // Memoiza a lista de materiais filtrada
  const filteredMateriais = useMemo(() => {
    return materiais.filter(material => {
      const matchesSearch = searchTermMateriais === "" ||
        material.material.toLowerCase().includes(searchTermMateriais.toLowerCase()) ||
        material.descricao.toLowerCase().includes(searchTermMateriais.toLowerCase());
      
      const matchesCategory = filtroCategoria === "Todas" || material.category === filtroCategoria;
      
      return matchesSearch && matchesCategory;
    });
  }, [materiais, searchTermMateriais, filtroCategoria]);

  // Memoiza a paginação dos materiais
  const paginatedMateriais = useMemo(() => {
    const startIndex = (currentPageMateriais - 1) * itemsPerPage;
    return filteredMateriais.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMateriais, currentPageMateriais, itemsPerPage]);

  const totalPagesMateriais = Math.ceil(filteredMateriais.length / itemsPerPage);

  // Callback para atualizar uma loja
  const handleLojaUpdate = useCallback(async (id: string, field: keyof LojaItem, value: any) => {
    const result = await updateLoja({ id, [field]: value });
    if (!result.success && result.error) {
      toast.error('Erro ao atualizar loja: ' + result.error);
    } else {
      toast.success('Loja atualizada com sucesso!');
    }
  }, [updateLoja]);

  // Callback para atualizar um material
  const handleMaterialUpdate = useCallback(async (id: string, field: keyof MaterialItem, value: any) => {
    const result = await updateMaterial({ id, [field]: value });
    if (!result.success && result.error) {
      toast.error('Erro ao atualizar material: ' + result.error);
    } else {
      toast.success('Material atualizado com sucesso!');
      if (field === 'category') {
        refreshCategories(); // Atualiza a lista de categorias se uma for alterada
      }
    }
  }, [updateMaterial, refreshCategories]);

  // Gera listas de valores únicos para os filtros
  const categoriasUnicas = useMemo(() => {
    return [...new Set(materiais.map(m => m.category).filter(Boolean))].sort();
  }, [materiais]);
  const ufsUnicas = [...new Set(lojas.map(l => l.uf))].sort();
  const tiposUnicos = [...new Set(lojas.map(l => l.tipo))].sort();

  // Função para lidar com o upload de arquivos
  const handleUpload = async (file: File) => {
    if (uploadType === 'lojas') {
      return await uploadLojas(file);
    } else {
      return await uploadMateriais(file);
    }
  };

  // Abre o modal de upload, definindo o tipo (lojas ou materiais)
  const openUploadModal = (type: 'lojas' | 'materiais') => {
    setUploadType(type);
    setShowUploadModal(true);
  };

  // Renderização de estado de erro
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // --- Renderização Principal do Componente --- //
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Cabeçalho da Página */}
      <div>
        <h2 className="text-2xl font-bold apple-font text-white">Cadastros</h2>
        <p className="text-gray-400">Gerencie lojas e materiais do sistema</p>
      </div>

      {/* Indicador de Carregamento */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">Carregando dados...</span>
        </div>
      )}

      {/* Conteúdo Principal (Tabelas) */}
      {!isLoading && (
        <>
          {/* Card de Cadastro de Lojas */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-white apple-font">
                  Cadastro de Lojas ({filteredLojas.length} {filteredLojas.length === 1 ? 'loja' : 'lojas'})
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowNovaLojaModal(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Loja
                  </Button>
                  <Button
                    onClick={() => openUploadModal('lojas')}
                    size="sm"
                    variant="outline"
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* Filtros da Tabela de Lojas */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou prefixo..."
                    value={searchTermLojas}
                    onChange={(e) => setSearchTermLojas(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
                  />
                </div>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-full sm:w-40 bg-gray-800/50 border-gray-700 text-white h-10">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Todos">Todos os tipos</SelectItem>
                    {tiposUnicos.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroUF} onValueChange={setFiltroUF}>
                  <SelectTrigger className="w-full sm:w-32 bg-gray-800/50 border-gray-700 text-white h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Todos">Todas UFs</SelectItem>
                    {ufsUnicas.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-800/50 hover:bg-gray-800/50">
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-24">PREFIXO</TableHead>
                      <TableHead className="text-gray-300 font-bold border-r border-gray-700 min-w-48">NOME</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-32">TIPO</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-16">UF</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-24">CENTRO</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-28">ZONA SECO</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-32">SUBZONA SECO</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-28">ZONA FRIO</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-28">ORDEM SECO</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center w-28">ORDEM FRIO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLojas.map((loja) => (
                      <TableRow key={loja.id} className="border-gray-700 hover:bg-gray-700/50">
                        <TableCell className="text-center border-r border-gray-700"><EditableCell value={loja.prefixo} onSave={(v) => handleLojaUpdate(loja.id, 'prefixo', v)} placeholder="Prefixo" /></TableCell>
                        <TableCell className="border-r border-gray-700"><EditableCell value={loja.nome} onSave={(v) => handleLojaUpdate(loja.id, 'nome', v)} placeholder="Nome da loja" /></TableCell>
                        <TableCell className="text-center border-r border-gray-700"><EditableCell value={loja.tipo} onSave={(v) => handleLojaUpdate(loja.id, 'tipo', v)} type="select" options={['CD', 'Loja Padrão', 'Administrativo']} /></TableCell>
                        <TableCell className="text-center border-r border-gray-700"><EditableCell value={loja.uf} onSave={(v) => handleLojaUpdate(loja.id, 'uf', v)} placeholder="UF" /></TableCell>
                        <TableCell className="text-center border-r border-gray-700"><EditableCell value={loja.centro} onSave={(v) => handleLojaUpdate(loja.id, 'centro', v)} placeholder="Centro" /></TableCell>
                        <TableCell className="text-center border-r border-gray-700"><EditableCell value={loja.zonaSeco} onSave={(v) => handleLojaUpdate(loja.id, 'zonaSeco', v)} placeholder="Zona" /></TableCell>
                        <TableCell className="text-center border-r border-gray-700"><EditableCell value={loja.subzonaSeco} onSave={(v) => handleLojaUpdate(loja.id, 'subzonaSeco', v)} placeholder="Subzona" /></TableCell>
                        <TableCell className="text-center border-r border-gray-700"><EditableCell value={loja.zonaFrio} onSave={(v) => handleLojaUpdate(loja.id, 'zonaFrio', v)} placeholder="Zona" /></TableCell>
                        <TableCell className="text-center border-r border-gray-700"><EditableCell value={loja.ordemSeco} onSave={(v) => handleLojaUpdate(loja.id, 'ordemSeco', v)} type="number" placeholder="0" /></TableCell>
                        <TableCell className="text-center"><EditableCell value={loja.ordemFrio} onSave={(v) => handleLojaUpdate(loja.id, 'ordemFrio', v)} type="number" placeholder="0" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Paginação da Tabela de Lojas */}
              {totalPagesLojas > 1 && (
                <Pagination
                  currentPage={currentPageLojas}
                  totalPages={totalPagesLojas}
                  onPageChange={setCurrentPageLojas}
                  totalItems={filteredLojas.length}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </CardContent>
          </Card>
          
          {/* Card de Cadastro de Materiais */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-white apple-font">
                  Cadastro de Materiais ({filteredMateriais.length} {filteredMateriais.length === 1 ? 'item' : 'itens'})
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowNovoMaterialModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Material
                  </Button>
                  <Button 
                    onClick={() => openUploadModal('materiais')}
                    variant="outline" 
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* Filtros da Tabela de Materiais */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por descrição ou código..."
                    value={searchTermMateriais}
                    onChange={(e) => setSearchTermMateriais(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
                  />
                </div>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="w-full sm:w-48 bg-gray-800/50 border-gray-700 text-white h-10">
                    <SelectValue placeholder="Filtrar por categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Todas">Todas Categorias</SelectItem>
                    {categoriasUnicas.map(categoria => (
                      <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-800/50 hover:bg-gray-800/50">
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-32">MATERIAL</TableHead>
                      <TableHead className="text-gray-300 font-bold border-r border-gray-700 min-w-64">DESCRIÇÃO</TableHead>
                      <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-40">CATEGORIA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMateriais.map((material) => (
                      <TableRow key={material.id} className="border-gray-700 hover:bg-gray-700/50">
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableCell value={material.material} onSave={(v) => handleMaterialUpdate(material.id, 'material', v)} placeholder="Código" />
                        </TableCell>
                        <TableCell className="border-r border-gray-700">
                          <EditableCell value={material.descricao} onSave={(v) => handleMaterialUpdate(material.id, 'descricao', v)} placeholder="Descrição" />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableCategory value={material.category} onSave={(v) => handleMaterialUpdate(material.id, 'category', v)} placeholder="Categoria" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação da Tabela de Materiais */}
              {totalPagesMateriais > 1 && (
                <Pagination
                  currentPage={currentPageMateriais}
                  totalPages={totalPagesMateriais}
                  onPageChange={setCurrentPageMateriais}
                  totalItems={filteredMateriais.length}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modais */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        type={uploadType}
      />
      <NovaLojaModal
        isOpen={showNovaLojaModal}
        onClose={() => setShowNovaLojaModal(false)}
        onSave={createLoja}
      />
      <NovoMaterialModal
        isOpen={showNovoMaterialModal}
        onClose={() => setShowNovoMaterialModal(false)}
        onSave={createMaterial}
      />
    </motion.div>
  );
}

// --- Componentes de Modal --- //

/**
 * @description Modal para fazer upload de arquivos Excel de Lojas ou Materiais.
 * @param {UploadModalProps} props - As propriedades do componente.
 */
function UploadModal({ isOpen, onClose, onUpload, type }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Lida com o processo de upload do arquivo.
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const result = await onUpload(selectedFile);
      if (result.success) {
        toast.success(`${type === 'lojas' ? 'Lojas' : 'Materiais'} importados com sucesso!`);
        onClose();
        setSelectedFile(null);
      } else {
        toast.error(result.error || 'Erro no upload');
      }
    } catch (error) {
      toast.error('Erro inesperado no upload');
    } finally {
      setIsUploading(false);
    }
  };

  // Define as colunas esperadas no arquivo Excel com base no tipo de upload.
  const expectedColumns = type === 'lojas' 
    ? 'PREFIXO, NOME, Tipo, UF, CENTRO, ZONA SECO, SUBZONA SECO, ZONA FRIO, ORDEM SECO, ORDEM FRIO'
    : 'MATERIAL, DESCRIÇÃO, CATEGORY'; // Ajustado para refletir a nova coluna 'category'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Upload de {type === 'lojas' ? 'Lojas' : 'Materiais'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-300 mb-2">
              <strong>Formato esperado do arquivo (.xlsx):</strong>
            </p>
            <p className="text-xs text-blue-200 font-mono">
              {expectedColumns}
            </p>
            {type === 'lojas' && (
              <p className="text-xs text-blue-200 mt-2">
                * Colunas obrigatórias: PREFIXO, NOME, UF.
              </p>
            )}
             {type === 'materiais' && (
              <p className="text-xs text-blue-200 mt-2">
                * Colunas obrigatórias: MATERIAL, DESCRIÇÃO, CATEGORY.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Arquivo Excel (.xlsx ou .xls)</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="bg-gray-800 border-gray-700 text-white file:text-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                'Importar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * @description Modal para criação de uma nova loja.
 * @param {NovaLojaModalProps} props - As propriedades do componente.
 */
function NovaLojaModal({ isOpen, onClose, onSave }: NovaLojaModalProps) {
  const initialState = {
    prefixo: '', nome: '', tipo: 'CD' as const, uf: '', centro: '',
    zonaSeco: '', subzonaSeco: '', zonaFrio: '', ordemSeco: 0, ordemFrio: 0
  };
  const [formData, setFormData] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);

  // Lida com o salvamento da nova loja.
  const handleSave = async () => {
    if (!formData.prefixo || !formData.nome || !formData.uf) {
      toast.error('Campos obrigatórios: Prefixo, Nome e UF');
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSave(formData);
      if (result.success) {
        toast.success('Loja criada com sucesso!');
        onClose();
        setFormData(initialState); // Reseta o formulário
      } else {
        toast.error(result.error || 'Erro ao criar loja');
      }
    } catch (error) {
      toast.error('Erro inesperado');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Loja</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Prefixo *</Label><Input value={formData.prefixo} onChange={(e) => setFormData(p => ({ ...p, prefixo: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Ex: 001"/></div>
          <div className="space-y-2"><Label>Nome *</Label><Input value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Nome da loja"/></div>
          <div className="space-y-2"><Label>Tipo</Label><Select value={formData.tipo} onValueChange={(v: any) => setFormData(p => ({ ...p, tipo: v }))}><SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-gray-800 border-gray-700"><SelectItem value="CD">CD</SelectItem><SelectItem value="Loja Padrão">Loja Padrão</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>UF *</Label><Input value={formData.uf} onChange={(e) => setFormData(p => ({ ...p, uf: e.target.value.toUpperCase() }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Ex: SP" maxLength={2}/></div>
          <div className="space-y-2"><Label>Centro</Label><Input value={formData.centro} onChange={(e) => setFormData(p => ({ ...p, centro: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Código do centro"/></div>
          <div className="space-y-2"><Label>Zona Seco</Label><Input value={formData.zonaSeco} onChange={(e) => setFormData(p => ({ ...p, zonaSeco: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Ex: A"/></div>
          <div className="space-y-2"><Label>Subzona Seco</Label><Input value={formData.subzonaSeco} onChange={(e) => setFormData(p => ({ ...p, subzonaSeco: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Ex: A1"/></div>
          <div className="space-y-2"><Label>Zona Frio</Label><Input value={formData.zonaFrio} onChange={(e) => setFormData(p => ({ ...p, zonaFrio: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Ex: F"/></div>
          <div className="space-y-2"><Label>Ordem Seco</Label><Input type="number" value={formData.ordemSeco} onChange={(e) => setFormData(p => ({ ...p, ordemSeco: Number(e.target.value) }))} className="bg-gray-800 border-gray-700 text-white" min="0"/></div>
          <div className="space-y-2"><Label>Ordem Frio</Label><Input type="number" value={formData.ordemFrio} onChange={(e) => setFormData(p => ({ ...p, ordemFrio: Number(e.target.value) }))} className="bg-gray-800 border-gray-700 text-white" min="0"/></div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
            {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/**
 * @description Modal para criação de um novo material.
 * @param {NovoMaterialModalProps} props - As propriedades do componente.
 */
function NovoMaterialModal({ isOpen, onClose, onSave }: NovoMaterialModalProps) {
  const initialState: Omit<MaterialItem, 'id'> = { material: '', descricao: '', category: '' };
  const [formData, setFormData] = useState<Omit<MaterialItem, 'id'>>(initialState);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshCategories } = useMaterialCategories();

  // Função para fechar e resetar o modal.
  const handleClose = () => {
    setFormData(initialState);
    setError('');
    onClose();
  };

  // Lida com a submissão do formulário.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.material || !formData.descricao || !formData.category) {
      setError('Material, descrição e categoria são obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      const result = await onSave(formData);
      if (result.success) {
        refreshCategories(); // Atualiza a lista de categorias no sistema
        handleClose();
        toast.success('Material criado com sucesso!');
      } else {
        setError(result.error || 'Erro ao salvar material');
        toast.error(result.error || 'Erro ao salvar material');
      }
    } catch (error) {
      setError('Erro inesperado');
      toast.error('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Novo Material
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <div className="space-y-2"><Label>Material *</Label><Input value={formData.material} onChange={(e) => setFormData(p => ({ ...p, material: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Ex: 123456" disabled={isLoading}/></div>
          <div className="space-y-2"><Label>Descrição *</Label><Input value={formData.descricao} onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" placeholder="Ex: ABACATE KG" disabled={isLoading}/></div>
          <div className="space-y-2"><Label>Categoria *</Label><CategoryCombobox value={formData.category} onValueChange={(value) => setFormData(p => ({ ...p, category: value }))} placeholder="Selecione ou digite uma categoria" disabled={isLoading}/></div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>) : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}