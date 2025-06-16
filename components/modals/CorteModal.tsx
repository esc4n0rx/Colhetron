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
  Check, 
  X, 
  ChevronDown,
  ChevronUp,
  Loader2,
  Info
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useCorteData } from '@/hooks/useCorteData'
import { CutModalProps, ProductData, StoreInfo, CutType } from '@/types/corte'

export default function CorteModal({ isOpen, onClose, onCutExecuted }: CutModalProps) {
  const {
    modalState,
    setModalState,
    searchProducts,
    getProductDetails,
    executeCut,
    getStoreInfo,
    resetModal
  } = useCorteData()

  const [storeInfo, setStoreInfo] = useState<StoreInfo[]>([])
  const [showMoreStores, setShowMoreStores] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

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

  // Estatísticas do produto selecionado
  const productStats = useMemo(() => {
    if (!modalState.selectedProduct) return null

    const totalStores = modalState.selectedProduct.stores.length
    const storesWithQuantity = modalState.selectedProduct.stores.filter(s => s.quantity > 0).length

    return {
      totalStores,
      storesWithQuantity,
      totalDistributed: modalState.selectedProduct.total_distributed
    }
  }, [modalState.selectedProduct])

  // Calcular estatísticas de corte
  const cutStats = useMemo(() => {
    if (!modalState.selectedProduct) return null

    let affectedStores = 0
    let totalCutQuantity = 0

    if (modalState.cutType === 'all') {
      affectedStores = modalState.selectedProduct.stores.filter(s => s.quantity > 0).length
      totalCutQuantity = modalState.selectedProduct.total_distributed
    } else if (modalState.cutType === 'specific') {
      affectedStores = modalState.selectedStores.size
      totalCutQuantity = modalState.selectedProduct.stores
        .filter(s => modalState.selectedStores.has(s.store_code))
        .reduce((sum, s) => sum + s.quantity, 0)
    } else if (modalState.cutType === 'partial') {
      affectedStores = modalState.partialCuts.size
      totalCutQuantity = Array.from(modalState.partialCuts.values())
        .reduce((sum, qty) => sum + qty, 0)
    }

    return {
      affectedStores,
      totalCutQuantity,
      remainingQuantity: modalState.selectedProduct.total_distributed - totalCutQuantity
    }
  }, [modalState])

  const handleProductSelect = async (product: ProductData) => {
    setModalState({ 
      selectedProduct: product,
      searchQuery: product.material_code,
      searchResults: []
    })
  }

  const handleCutTypeChange = (cutType: CutType) => {
    setModalState({ 
      cutType,
      selectedStores: new Set(),
      partialCuts: new Map()
    })
  }

  const handleStoreToggle = (storeCode: string, checked: boolean) => {
    const newSelected = new Set(modalState.selectedStores)
    if (checked) {
      newSelected.add(storeCode)
    } else {
      newSelected.delete(storeCode)
    }
    setModalState({ selectedStores: newSelected })
  }

  const handlePartialCutChange = (storeCode: string, quantity: number) => {
    const newPartialCuts = new Map(modalState.partialCuts)
    if (quantity > 0) {
      newPartialCuts.set(storeCode, quantity)
    } else {
      newPartialCuts.delete(storeCode)
    }
    setModalState({ partialCuts: newPartialCuts })
  }

  const handleExecuteCut = async () => {
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

    // Confirmar ação
    const confirmMessage = `Deseja realmente cortar ${cutStats.totalCutQuantity} unidade(s) de ${cutStats.affectedStores} loja(s) do produto ${modalState.selectedProduct.material_code}?`
    
    if (!confirm(confirmMessage)) return

    setModalState({ isLoading: true })

    try {
      let cutRequest: any = {
        material_code: modalState.selectedProduct.material_code,
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
    return store ? `${storeCode} - ${store.nome}` : storeCode
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white w-full max-w-4xl h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Header fixo */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-700 flex-shrink-0">
          <DialogTitle className="flex items-center text-xl">
            <Scissors className="w-6 h-6 mr-3 text-red-400" />
            Corte de Produtos
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Selecione um produto e configure as opções de corte
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-6 pr-4">
              {/* Busca de Produto */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Buscar Produto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Digite o código ou descrição do produto..."
                    value={modalState.searchQuery}
                    onChange={(e) => setModalState({ searchQuery: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                  {modalState.isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-400" />
                  )}
                </div>

                {/* Resultados da Busca */}
                <AnimatePresence>
                  {modalState.searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-800 border border-gray-700 rounded-lg max-h-40 overflow-y-auto"
                    >
                      {modalState.searchResults.map((product, index) => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">{product.material_code}</p>
                              <p className="text-xs text-gray-400 truncate max-w-xs">{product.description}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {product.total_distributed} unidades
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Produto Selecionado */}
              {modalState.selectedProduct && productStats && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg">
                        <Package className="w-5 h-5 mr-2 text-blue-400" />
                        Produto Selecionado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-lg font-semibold">{modalState.selectedProduct.material_code}</p>
                        <p className="text-sm text-gray-400 break-words">{modalState.selectedProduct.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-2xl font-bold text-blue-400">{productStats.totalDistributed}</p>
                          <p className="text-xs text-gray-400">Total Distribuído</p>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-2xl font-bold text-green-400">{productStats.storesWithQuantity}</p>
                          <p className="text-xs text-gray-400">Lojas com Estoque</p>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-2xl font-bold text-purple-400">{productStats.totalStores}</p>
                          <p className="text-xs text-gray-400">Total de Lojas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Opções de Corte */}
                  <Tabs value={modalState.cutType} onValueChange={(value) => handleCutTypeChange(value as CutType)}>
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-gray-800 h-auto">
                      <TabsTrigger value="all" className="data-[state=active]:bg-red-600 py-3">
                        Cortar Tudo
                      </TabsTrigger>
                      <TabsTrigger value="specific" className="data-[state=active]:bg-orange-600 py-3">
                        Lojas Específicas
                      </TabsTrigger>
                      <TabsTrigger value="partial" className="data-[state=active]:bg-yellow-600 py-3">
                        Corte Parcial
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-3 mt-4">
                      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-red-400">Atenção: Corte Total</p>
                            <p className="text-sm text-gray-400">
                              Todas as quantidades deste produto serão removidas de todas as lojas
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="specific" className="space-y-3 mt-4">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg">
                        <div className="p-4 border-b border-gray-700">
                          <h4 className="font-medium flex items-center">
                            <Store className="w-4 h-4 mr-2" />
                            Selecionar Lojas para Corte
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Escolha as lojas que terão o produto cortado completamente
                          </p>
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto">
                          <div className="p-4 space-y-2">
                            {displayedStores.map((store) => (
                              <div key={store.store_code} className="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <Checkbox
                                    checked={modalState.selectedStores.has(store.store_code)}
                                    onCheckedChange={(checked) => handleStoreToggle(store.store_code, checked as boolean)}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{getStoreDisplayName(store.store_code)}</p>
                                    <p className="text-xs text-gray-400">Quantidade: {store.quantity}</p>
                                  </div>
                                </div>
                                <Badge variant={store.quantity > 0 ? "default" : "secondary"} className="ml-2 flex-shrink-0">
                                  {store.quantity}
                                </Badge>
                              </div>
                            ))}
                            
                            {modalState.selectedProduct.stores.length > initialStoresDisplay && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowMoreStores(!showMoreStores)}
                                className="w-full mt-2"
                              >
                                {showMoreStores ? (
                                  <>
                                    <ChevronUp className="w-4 h-4 mr-2" />
                                    Mostrar Menos
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4 mr-2" />
                                    Mostrar Mais ({modalState.selectedProduct.stores.length - initialStoresDisplay} restantes)
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="partial" className="space-y-3 mt-4">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg">
                        <div className="p-4 border-b border-gray-700">
                          <h4 className="font-medium flex items-center">
                            <Info className="w-4 h-4 mr-2" />
                            Definir Quantidades para Corte
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Especifique a quantidade a ser cortada de cada loja
                          </p>
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto">
                          <div className="p-4 space-y-3">
                            {displayedStores.filter(store => store.quantity > 0).map((store) => (
                              <div key={store.store_code} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{getStoreDisplayName(store.store_code)}</p>
                                  <p className="text-xs text-gray-400">Disponível: {store.quantity}</p>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={store.quantity}
                                    value={modalState.partialCuts.get(store.store_code) || ''}
                                    onChange={(e) => handlePartialCutChange(store.store_code, parseInt(e.target.value) || 0)}
                                    className="w-20 h-8 text-center bg-gray-800 border-gray-600"
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-gray-400">/ {store.quantity}</span>
                                </div>
                              </div>
                            ))}
                            
                            {modalState.selectedProduct.stores.length > initialStoresDisplay && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowMoreStores(!showMoreStores)}
                                className="w-full mt-2"
                              >
                                {showMoreStores ? (
                                  <>
                                    <ChevronUp className="w-4 h-4 mr-2" />
                                    Mostrar Menos
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4 mr-2" />
                                    Mostrar Mais
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Resumo do Corte */}
                  {cutStats && cutStats.totalCutQuantity > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4"
                    >
                      <h4 className="font-medium text-yellow-400 mb-3">Resumo do Corte</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-red-400">{cutStats.affectedStores}</p>
                          <p className="text-xs text-gray-400">Lojas Afetadas</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-400">{cutStats.totalCutQuantity}</p>
                          <p className="text-xs text-gray-400">Unidades Cortadas</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-400">{cutStats.remainingQuantity}</p>
                          <p className="text-xs text-gray-400">Unidades Restantes</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer fixo com ações */}
        {modalState.selectedProduct && (
          <div className="p-6 pt-4 border-t border-gray-700 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={modalState.isLoading} className="order-2 sm:order-1">
                Cancelar
              </Button>
              <Button
                onClick={handleExecuteCut}
                disabled={modalState.isLoading || !cutStats || cutStats.totalCutQuantity === 0}
                className="bg-red-600 hover:bg-red-700 order-1 sm:order-2"
              >
                {modalState.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Executar Corte
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}