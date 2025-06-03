"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface Tab {
  id: string
  label: string
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export default function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-800">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <motion.div key={tab.id} className="relative">
            <Button
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative px-6 py-3 font-semibold apple-font transition-all duration-300
                ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }
              `}
            >
              {tab.label}
            </Button>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
