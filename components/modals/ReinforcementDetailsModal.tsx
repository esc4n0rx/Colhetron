// components/modals/ReinforcementDetailsModal.tsx
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { FileText, Calendar } from "lucide-react";

interface Reinforcement {
  file_name: string;
  created_at: string;
  data: {
    materials: Array<{ code: string; description: string }>;
    stores: string[];
    quantities: Array<{ materialIndex: number; storeCode: string; quantity: number }>;
  };
}

interface ReinforcementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reinforcements: Reinforcement[];
}

export default function ReinforcementDetailsModal({ isOpen, onClose, reinforcements }: ReinforcementDetailsModalProps) {
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-400" />
            Detalhes dos Reforços
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Visualize os detalhes de cada arquivo de reforço carregado para esta separação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {reinforcements.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {reinforcements.map((reinforcement, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-gray-700">
                    <AccordionTrigger className="hover:no-underline hover:bg-gray-800/50 px-4 rounded-md">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-white">{reinforcement.file_name}</span>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(reinforcement.created_at)}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 bg-gray-800/30 rounded-b-md">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-700">
                            <TableHead className="text-gray-300">Material</TableHead>
                            {reinforcement.data.stores.map(store => (
                              <TableHead key={store} className="text-center text-gray-300">{store}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reinforcement.data.materials.map((material, matIndex) => (
                            <TableRow key={material.code} className="border-gray-700">
                              <TableCell>
                                <div className="font-medium text-white">{material.description}</div>
                                <div className="text-xs text-gray-400 font-mono">{material.code}</div>
                              </TableCell>
                              {reinforcement.data.stores.map(store => {
                                const qty = reinforcement.data.quantities.find(q => q.materialIndex === matIndex && q.storeCode === store);
                                return (
                                  <TableCell key={`${material.code}-${store}`} className="text-center">
                                    <span className={qty && qty.quantity > 0 ? 'text-green-400 font-semibold' : 'text-gray-500'}>
                                      {qty?.quantity || 0}
                                    </span>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center text-gray-500 py-20">
                Nenhum reforço encontrado para esta separação.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}