// app/components/modals/CorteModal.tsx
"use client"

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Package, 
  Scissors, 
  Store, 
  AlertTriangle, 
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Plus,
  Minus
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useCorteData } from '@/hooks/useCorteData'
import { CutModalProps, ProductData, StoreInfo, CutType } from '@/types/corte'
import { cn } from '@/lib/utils'

export default function CorteModal({ isOpen, onClose, onCutExecuted }: CutModalProps) {
  const {
    modalState,
    setModalState,
    searchProducts,
    executeCut,
    getStoreInfo,
    resetModal
  } = useCorteData()

  const [storeInfo, setStoreInfo] = useState<StoreInfo[]>([])
  const [showMoreStores, setShowMoreStores] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Responsivo: ajustar quantidade inicial baseado no tamanho da tela
  const initialStoresDisplay = 8

  // Carregar informações das lojas ao abrir modal
  useEffect(() => {
    if (isOpen) {
      getStoreInfo().then(setStoreInfo)
      setModalState({ isOpen: true })
    } else {
      resetModal()
    }
  }, [isOpen, getStoreInfo, setModalState, resetModal])

  // Busca com debounce
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)

    if (modalState.searchQuery.length >= 2) {
      const timeout = setTimeout(() => {
        const isCode = /^\d+$/.test(modalState.searchQuery)
        searchProducts({
          query: modalState.searchQuery,
          type: isCode ? 'code' : 'description'
        })
      }, 500)
      
      setSearchTimeout(timeout)
    } else {
      setModalState({ searchResults: [] })
    }

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout)
    }
  }, [modalState.searchQuery, searchProducts, setModalState])

  // Produtos filtrados para exibição
  const displayedStores = useMemo(() => {
    if (!modalState.selectedProduct) return []
    
    const stores = modalState.selectedProduct.stores
    return showMoreStores ? stores : stores.slice(0, initialStoresDisplay)
  }, [modalState.selectedProduct, showMoreStores])

  // Estatísticas do corte
  const cutStats = useMemo(() => {
    if (!modalState.selectedProduct) return null

    const { stores } = modalState.selectedProduct
    let totalCutQuantity = 0
    let affectedStores = 0

    if (modalState.cutType === 'all') {
      totalCutQuantity = stores.reduce((sum, store) => sum + store.quantity, 0)
      affectedStores = stores.length
    } else if (modalState.cutType === 'specific') {
      stores.forEach(store => {
        if (modalState.selectedStores.has(store.store_code)) {
          totalCutQuantity += store.quantity
          affectedStores++
        }
      })
    } else if (modalState.cutType === 'partial') {
      modalState.partialCuts.forEach((quantity) => {
        totalCutQuantity += quantity
        affectedStores++
      })
    }

    return {
      totalCutQuantity,
      affectedStores,
      totalStores: stores.length,
      remainingQuantity: modalState.selectedProduct.total_distributed - totalCutQuantity
    }
  }, [modalState.selectedProduct, modalState.cutType, modalState.selectedStores, modalState.partialCuts])

  const handleProductSelect = (product: ProductData) => {
    setModalState({ 
      selectedProduct: product,
      selectedStores: new Set(),
      partialCuts: new Map()
    })
  }

  const handleStoreToggle = (storeCode: string) => {
    const newSelected = new Set(modalState.selectedStores)
    if (newSelected.has(storeCode)) {
      newSelected.delete(storeCode)
    } else {
      newSelected.add(storeCode)
    }
    setModalState({ selectedStores: newSelected })
  }

  const handlePartialQuantityChange = (storeCode: string, quantity: number) => {
    const newPartialCuts = new Map(modalState.partialCuts)
    if (quantity > 0) {
      newPartialCuts.set(storeCode, quantity)
    } else {
      newPartialCuts.delete(storeCode)
    }
    setModalState({ partialCuts: newPartialCuts })
  }

  const handleCutClick = () => {
    if (!modalState.selectedProduct || !cutStats) return

    // Validações
    if (modalState.cutType === 'specific' && modalState.selectedStores.size === 0) {
      toast.error('Selecione pelo menos uma loja para corte específico')
      return
    }

    if (modalState.cutType === 'partial' && modalState.partialCuts.size === 0) {
      toast.error('Defina pelo menos uma quantidade para corte parcial')
      return
    }

    // Abrir modal de confirmação
    setShowConfirmDialog(true)
  }

  const handleConfirmCut = async () => {
    if (!modalState.selectedProduct || !cutStats) return

    setModalState({ isLoading: true })
    setShowConfirmDialog(false)

    try {
      let cutRequest: any = {
        material_code: modalState.selectedProduct.material_code,
        description: modalState.selectedProduct.description,
        cut_type: modalState.cutType
      }

      if (modalState.cutType === 'specific') {
        cutRequest.stores = Array.from(modalState.selectedStores).map(storeCode => ({
          store_code: storeCode,
          cut_all: true
        }))
      } else if (modalState.cutType === 'partial') {
        cutRequest.partial_cuts = Array.from(modalState.partialCuts.entries()).map(([storeCode, quantity]) => {
          const currentStore = modalState.selectedProduct!.stores.find(s => s.store_code === storeCode)
          return {
            store_code: storeCode,
            quantity_to_cut: quantity,
            current_quantity: currentStore?.quantity || 0
          }
        })
      }

      const result = await executeCut(cutRequest)
      
      if (result?.success) {
        onCutExecuted()
        onClose()
      }

    } finally {
      setModalState({ isLoading: false })
    }
  }

  const getStoreDisplayName = (storeCode: string) => {
    const store = storeInfo.find(s => s.prefixo === storeCode)
    return store ? `${store.prefixo} - ${store.nome}` : storeCode
  }

  if (!isOpen) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 gap-0 bg-background border-border">
          {/* Header Compacto */}
          <DialogHeader className="px-6 py-4 border-b border-border bg-card/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Corte de Produto</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Busque e selecione um produto para executar o corte
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Layout Responsivo Principal */}
          <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
            {/* Seção de Busca - Responsiva */}
            <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
              {/* Campo de Busca */}
              <div className="p-4 border-b border-border bg-card/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código ou descrição..."
                    value={modalState.searchQuery}
                    onChange={(e) => setModalState({ searchQuery: e.target.value })}
                    className="pl-10 bg-background border-input focus-visible:ring-1"
                  />
                </div>
                {modalState.searchQuery.length > 0 && modalState.searchQuery.length < 2 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Digite pelo menos 2 caracteres para buscar
                  </p>
                )}
              </div>

              {/* Resultados da Busca */}
              <div className="flex-1 overflow-hidden">
                {modalState.searchQuery.length >= 2 ? (
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                      {modalState.isLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center space-y-3">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                            <p className="text-sm text-muted-foreground">Buscando produtos...</p>
                          </div>
                        </div>
                      ) : modalState.searchResults.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground px-1">
                            {modalState.searchResults.length} resultado(s) encontrado(s)
                          </p>
                          {modalState.searchResults.map((product) => (
                            <motion.div
                              key={product.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm group",
                                modalState.selectedProduct?.id === product.id 
                                  ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20" 
                                  : "bg-card hover:bg-card/80 border-border"
                              )}
                              onClick={() => handleProductSelect(product)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-sm font-medium">
                                    {product.material_code}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {product.total_distributed}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                                  {product.description}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    <Store className="h-3 w-3 mr-1" />
                                    {product.stores.length} lojas
                                  </Badge>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center space-y-3">
                            <Package className="h-8 w-8 mx-auto text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Nenhum produto encontrado</p>
                              <p className="text-xs text-muted-foreground">
                                Tente uma busca diferente
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3 px-4">
                      <Search className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Iniciar Busca</p>
                        <p className="text-xs text-muted-foreground">
                          Digite um código ou descrição para buscar produtos
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção de Detalhes e Configuração - Responsiva */}
            <div className="flex-1 flex flex-col min-h-0">
              {modalState.selectedProduct ? (
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Informações do Produto - Compacto */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold font-mono">
                            {modalState.selectedProduct.material_code}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {modalState.selectedProduct.description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-sm px-3 py-1">
                            {modalState.selectedProduct.total_distributed} unidades
                          </Badge>
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {modalState.selectedProduct.stores.length} lojas
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Tipos de Corte - Grid Responsivo */}
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold">Tipo de Corte</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { 
                            value: 'all' as CutType, 
                            label: 'Cortar Tudo', 
                            desc: 'Remove de todas as lojas',
                            icon: Scissors
                          },
                          { 
                            value: 'specific' as CutType, 
                            label: 'Lojas Específicas', 
                            desc: 'Remove das lojas selecionadas',
                            icon: Store
                          },
                          { 
                            value: 'partial' as CutType, 
                            label: 'Corte Parcial', 
                            desc: 'Quantidade específica por loja',
                            icon: Package
                          }
                        ].map((option) => {
                          const IconComponent = option.icon
                          return (
                            <Label key={option.value} className="cursor-pointer">
                              <div className={cn(
                                "p-4 border rounded-lg transition-all hover:shadow-sm",
                                modalState.cutType === option.value 
                                  ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20" 
                                  : "bg-card hover:bg-card/80 border-border"
                              )}>
                                <div className="flex items-start space-x-3">
                                  <div className="flex items-center">
                                    <input
                                      type="radio"
                                      name="cutType"
                                      value={option.value}
                                      checked={modalState.cutType === option.value}
                                      onChange={(e) => setModalState({ 
                                        cutType: e.target.value as CutType,
                                        selectedStores: new Set(),
                                        partialCuts: new Map()
                                      })}
                                      className="sr-only"
                                    />
                                    <div className={cn(
                                      "h-4 w-4 rounded-full border-2 transition-all",
                                      modalState.cutType === option.value
                                        ? "border-primary bg-primary"
                                        : "border-muted-foreground"
                                    )}>
                                      {modalState.cutType === option.value && (
                                        <div className="h-2 w-2 bg-primary-foreground rounded-full m-0.5" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <IconComponent className="h-4 w-4" />
                                      <span className="text-sm font-medium">
                                        {option.label}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {option.desc}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </Label>
                          )
                        })}
                      </div>
                    </div>

                    {/* Lista de Lojas - Layout Otimizado */}
                    {modalState.cutType !== 'all' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-semibold">Lojas Disponíveis</h4>
                          {modalState.selectedProduct.stores.length > initialStoresDisplay && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowMoreStores(!showMoreStores)}
                              className="text-xs"
                            >
                              {showMoreStores ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Mostrar menos
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Mostrar todas ({modalState.selectedProduct.stores.length})
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                          <AnimatePresence>
                            {displayedStores.map((store, index) => (
                              <motion.div
                                key={store.store_code}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: index * 0.02 }}
                                className="p-3 border rounded-lg bg-card hover:bg-card/80 transition-colors"
                              >
                                <div className="space-y-3">
                                  {/* Header da Loja */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {getStoreDisplayName(store.store_code)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {store.quantity} unidades
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                                      {store.quantity}
                                    </Badge>
                                  </div>

                                  {/* Controles por Tipo de Corte */}
                                  {modalState.cutType === 'specific' && (
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={modalState.selectedStores.has(store.store_code)}
                                        onCheckedChange={() => handleStoreToggle(store.store_code)}
                                        className="shrink-0"
                                      />
                                      <Label className="text-xs cursor-pointer flex-1">
                                        Cortar toda a quantidade
                                      </Label>
                                    </div>
                                  )}

                                  {modalState.cutType === 'partial' && (
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium">
                                        Quantidade a cortar:
                                      </Label>
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => {
                                            const current = modalState.partialCuts.get(store.store_code) || 0
                                            if (current > 0) {
                                              handlePartialQuantityChange(store.store_code, current - 1)
                                            }
                                          }}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input
                                          type="number"
                                          min="0"
                                          max={store.quantity}
                                          value={modalState.partialCuts.get(store.store_code) || 0}
                                          onChange={(e) => {
                                            const value = Math.min(parseInt(e.target.value) || 0, store.quantity)
                                            handlePartialQuantityChange(store.store_code, value)
                                          }}
                                          className="h-8 text-center text-xs"
                                        />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => {
                                            const current = modalState.partialCuts.get(store.store_code) || 0
                                            if (current < store.quantity) {
                                              handlePartialQuantityChange(store.store_code, current + 1)
                                            }
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                    {/* Resumo do Corte */}
                    {cutStats && cutStats.totalCutQuantity > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-muted/50 border border-border rounded-lg space-y-3"
                      >
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          Resumo do Corte
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Unidades a Cortar</p>
                            <p className="font-semibold text-destructive">
                              {cutStats.totalCutQuantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Lojas Afetadas</p>
                            <p className="font-semibold text-destructive">
                              {cutStats.affectedStores}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total de Lojas</p>
                            <p className="font-semibold">
                              {cutStats.totalStores}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Unidades Restantes</p>
                            <p className="font-semibold text-green-600">
                              {cutStats.remainingQuantity}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-3 px-4">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">Selecione um Produto</p>
                      <p className="text-sm text-muted-foreground">
                        Busque e escolha um produto na lista ao lado para começar o processo de corte
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer com Ações - Compacto */}
          {modalState.selectedProduct && (
            <div className="p-4 border-t border-border bg-card/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
               <div className="text-xs text-muted-foreground">
                 {cutStats ? (
                   `${cutStats.totalCutQuantity} unidades serão cortadas de ${cutStats.affectedStores} loja(s)`
                 ) : (
                   'Configure o tipo de corte para visualizar o resumo'
                 )}
               </div>
               <div className="flex gap-2">
                 <Button
                   variant="outline"
                   onClick={onClose}
                   disabled={modalState.isLoading}
                   className="min-w-0"
                 >
                   Cancelar
                 </Button>
                 <Button
                   onClick={handleCutClick}
                   disabled={!cutStats || cutStats.totalCutQuantity === 0 || modalState.isLoading}
                   className="min-w-0 bg-destructive hover:bg-destructive/90"
                 >
                   {modalState.isLoading ? (
                     <>
                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       Executando...
                     </>
                   ) : (
                     <>
                       <Scissors className="h-4 w-4 mr-2" />
                       Executar Corte
                     </>
                   )}
                 </Button>
               </div>
             </div>
           </div>
         )}
       </DialogContent>
     </Dialog>

     {/* Modal de Confirmação - Melhorado */}
     <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
       <AlertDialogContent className="bg-background border-border max-w-md">
         <AlertDialogHeader>
           <AlertDialogTitle className="flex items-center gap-2 text-destructive">
             <AlertTriangle className="h-5 w-5" />
             Confirmar Corte de Produto
           </AlertDialogTitle>
           <AlertDialogDescription className="space-y-4">
             {modalState.selectedProduct && cutStats && (
               <div className="space-y-3">
                 <p className="text-sm">
                   Você está prestes a executar o corte com as seguintes configurações:
                 </p>
                 
                 <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                   <div className="grid grid-cols-2 gap-2">
                     <span className="text-muted-foreground">Produto:</span>
                     <span className="font-mono font-medium">
                       {modalState.selectedProduct.material_code}
                     </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                     <span className="text-muted-foreground">Tipo de Corte:</span>
                     <span className="font-medium">
                       {modalState.cutType === 'all' ? 'Cortar Tudo' : 
                        modalState.cutType === 'specific' ? 'Lojas Específicas' : 
                        'Corte Parcial'}
                     </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                     <span className="text-muted-foreground">Unidades:</span>
                     <span className="font-bold text-destructive">
                       -{cutStats.totalCutQuantity}
                     </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                     <span className="text-muted-foreground">Lojas Afetadas:</span>
                     <span className="font-bold text-destructive">
                       {cutStats.affectedStores}
                     </span>
                   </div>
                 </div>

                 <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                   <div className="flex items-start gap-2">
                     <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                     <div className="space-y-1">
                       <p className="text-sm font-medium text-destructive">
                         Atenção: Ação irreversível
                       </p>
                       <p className="text-xs text-destructive/80">
                         Esta operação não pode ser desfeita. As quantidades serão removidas permanentemente da separação.
                       </p>
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </AlertDialogDescription>
         </AlertDialogHeader>
         
         <AlertDialogFooter className="gap-2">
           <AlertDialogCancel className="bg-background border-border hover:bg-muted">
             Cancelar
           </AlertDialogCancel>
           <AlertDialogAction
             onClick={handleConfirmCut}
             className="bg-destructive hover:bg-destructive/90"
           >
             Confirmar Corte
           </AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   </>
 )
}