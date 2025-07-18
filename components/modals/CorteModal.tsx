// app/components/modals/CorteModal.tsx
"use client"

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Package, 
  Scissors, 
  Store, 
  AlertTriangle, 
  ChevronDown,
  ChevronUp,
  Loader2
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

  const initialStoresDisplay = 6 // Reduzido para melhor visualização

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
      modalState.partialCuts.forEach((quantity, storeCode) => {
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
        <DialogContent className="max-w-7xl w-full max-h-[95vh] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Scissors className="h-6 w-6 text-primary" />
              Corte de Produto
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Busque e selecione um produto para executar o corte nas lojas desejadas
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="flex h-[calc(95vh-200px)]">
            {/* Search Section - Melhor largura */}
            <div className="w-96 border-r flex flex-col">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código ou descrição..."
                    value={modalState.searchQuery}
                    onChange={(e) => setModalState({ searchQuery: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results - Melhor espaçamento */}
              <div className="flex-1 overflow-hidden">
                {modalState.searchQuery.length >= 2 ? (
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {modalState.isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2">Buscando produtos...</span>
                        </div>
                      ) : modalState.searchResults.length > 0 ? (
                        modalState.searchResults.map((product) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                              modalState.selectedProduct?.id === product.id 
                                ? 'border-primary bg-primary/10' 
                                : 'hover:border-muted-foreground/50'
                            }`}
                            onClick={() => handleProductSelect(product)}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-lg">{product.material_code}</p>
                                <Badge variant="outline">
                                  {product.total_distributed} un
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {product.description}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{product.stores.length} lojas</span>
                                {modalState.selectedProduct?.id === product.id && (
                                  <Badge variant="default" className="text-xs">
                                    Selecionado
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum produto encontrado</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Digite pelo menos 2 caracteres para buscar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Details Section */}
            <div className="flex-1 flex flex-col">
              {modalState.selectedProduct ? (
                <>
                  {/* Product Info - Melhor espaçamento */}
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-bold">{modalState.selectedProduct.material_code}</h3>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          {modalState.selectedProduct.total_distributed} unidades
                        </Badge>
                        <Badge variant="outline" className="text-base px-3 py-1">
                          {modalState.selectedProduct.stores.length} lojas
                        </Badge>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-lg">{modalState.selectedProduct.description}</p>
                  </div>

                  {/* Cut Options - Melhor layout */}
                  <div className="p-6 border-b">
                    <h4 className="text-lg font-semibold mb-4">Tipo de Corte</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'all', label: 'Cortar Tudo', desc: 'Remove o produto de todas as lojas' },
                        { value: 'specific', label: 'Lojas Específicas', desc: 'Remove apenas das lojas selecionadas' },
                        { value: 'partial', label: 'Corte Parcial', desc: 'Define quantidade específica por loja' }
                      ].map((option) => (
                        <Label key={option.value} className="cursor-pointer">
                          <div className={`p-4 border rounded-lg transition-all hover:shadow-sm ${
                            modalState.cutType === option.value 
                              ? 'border-primary bg-primary/10' 
                              : 'hover:border-muted-foreground/50'
                          }`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <input
                                type="radio"
                                name="cutType"
                                value={option.value}
                                checked={modalState.cutType === option.value}
                                onChange={(e) => setModalState({ cutType: e.target.value as CutType })}
                                className="text-primary"
                              />
                              <span className="font-medium">{option.label}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {option.desc}
                            </p>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </div>

                  {/* Store Selection - Melhor altura */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 pb-4 border-b">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold">
                          {modalState.cutType === 'specific' ? 'Selecionar Lojas' : 
                           modalState.cutType === 'partial' ? 'Quantidades por Loja' : 
                           'Distribuição por Loja'}
                        </h4>
                        {modalState.selectedProduct.stores.length > initialStoresDisplay && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMoreStores(!showMoreStores)}
                          >
                            {showMoreStores ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Mostrar Menos
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Mostrar Mais (+{modalState.selectedProduct.stores.length - initialStoresDisplay})
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Stores List - Melhor espaçamento */}
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="p-6 pt-2 space-y-3">
                          {displayedStores.map((store) => (
                            <div key={store.store_code} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-center space-x-3">
                                {modalState.cutType === 'specific' && (
                                  <Checkbox
                                    checked={modalState.selectedStores.has(store.store_code)}
                                    onCheckedChange={() => handleStoreToggle(store.store_code)}
                                  />
                                )}
                                <div className="flex items-center space-x-2">
                                  <Store className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{getStoreDisplayName(store.store_code)}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Disponível: {store.quantity} unidades
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {modalState.cutType === 'partial' && (
                                  <Input
                                    type="number"
                                    min="0"
                                    max={store.quantity}
                                    placeholder="0"
                                    value={modalState.partialCuts.get(store.store_code) || ''}
                                    onChange={(e) => handlePartialQuantityChange(store.store_code, parseInt(e.target.value) || 0)}
                                    className="w-24 text-center"
                                  />
                                )}
                                <Badge variant="outline" className="text-sm">
                                  {store.quantity} un
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  {/* Cut Summary - Melhor visualização */}
                  {cutStats && cutStats.totalCutQuantity > 0 && (
                    <div className="p-6 border-t">
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <h5 className="font-semibold text-destructive">Resumo do Corte</h5>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground">Unidades a Cortar</p>
                            <p className="text-xl font-bold text-destructive">{cutStats.totalCutQuantity}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Lojas Afetadas</p>
                            <p className="text-xl font-bold text-destructive">{cutStats.affectedStores}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Permanecerá</p>
                            <p className="text-xl font-bold text-primary">{cutStats.remainingQuantity}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Total de Lojas</p>
                            <p className="text-xl font-bold">{cutStats.totalStores}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-xl font-medium text-muted-foreground">
                      Selecione um produto para continuar
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Use a busca ao lado para encontrar o produto desejado
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t flex justify-between items-center">
            <Button variant="outline" onClick={onClose} disabled={modalState.isLoading}>
              Cancelar
            </Button>
            
            {modalState.selectedProduct && cutStats && cutStats.totalCutQuantity > 0 && (
              <Button 
                onClick={handleCutClick}
                disabled={modalState.isLoading}
                className="bg-destructive hover:bg-destructive/90"
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
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Corte de Produto
            </AlertDialogTitle>
            <AlertDialogDescription>
              {modalState.selectedProduct && cutStats && (
                <div className="space-y-3">
                  <p>Você está prestes a executar o corte com as seguintes configurações:</p>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Produto:</span>
                      <span>{modalState.selectedProduct.material_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Tipo de Corte:</span>
                      <span className="capitalize">
                        {modalState.cutType === 'all' ? 'Cortar Tudo' : 
                         modalState.cutType === 'specific' ? 'Lojas Específicas' : 
                         'Corte Parcial'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Unidades a Cortar:</span>
                      <span className="text-destructive font-bold">{cutStats.totalCutQuantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Lojas Afetadas:</span>
                      <span className="text-destructive font-bold">{cutStats.affectedStores}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Atenção:</strong> Esta ação não pode ser desfeita.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
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