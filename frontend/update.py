import re

with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/app/predictor/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { AnimatePresence } from "framer-motion";', 'import { AnimatePresence, motion } from "framer-motion";\nimport { AuthGate } from "@/components/AuthGate";')
content = content.replace('export default function Home() {', 'export default function PredictorPage() {')

# Remove the landing page sections and the ViewTransition wrapper
pattern = r'<AnimatePresence mode="wait">\s*\{!showPredictor && \([\s\S]*?\)\}\s*\{/\* DASHBOARD PREDICTOR CORE WITH HOVER EXPANDABLE SIDEBAR \*/\}\s*\{showPredictor && \(\s*<ViewTransition viewKey="predictor" className="flex min-h-0 flex-1 flex-col">\s*\{!isAllowed \? \([\s\S]*?\) : \(\s*<div className="flex-1 flex h-\[calc\(100vh-73px\)\] w-full overflow-hidden relative">'
replacement = '<AuthGate>\n          <div className="flex-1 flex h-[calc(100vh-73px)] w-full overflow-hidden relative">'
content = re.sub(pattern, replacement, content)

# Remove the ending tags of ViewTransition and AnimatePresence
end_pattern = r'</main>\s*</div>\s*\)\}\s*</ViewTransition>\s*\)\}\s*</AnimatePresence>'
end_replacement = '</main>\n          </div>\n        </AuthGate>'
content = re.sub(end_pattern, end_replacement, content)

# Button animation replacement
button_pattern = r'<button\s*onClick=\{handleScrollToggle\}\s*className="fixed right-6 bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900/95 text-white px-4 py-3 text-xs font-bold shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all duration-300"\s*>\s*\{isAtBottom \? \(\s*<>\s*Scroll to Top\s*<ArrowUp className="h-4 w-4" />\s*</>\s*\) : \(\s*<>\s*Scroll to Bottom\s*<ArrowDownNarrowWide className="h-4 w-4" />\s*</>\s*\)\}\s*</button>'
button_replacement = """<button
                    onClick={handleScrollToggle}
                    className="fixed right-6 bottom-6 z-40 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900/95 text-white h-12 w-40 text-xs font-bold shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all duration-300 overflow-hidden"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isAtBottom ? (
                        <motion.div
                          key="top"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2"
                        >
                          Scroll to Top
                          <ArrowUp className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="bottom"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2"
                        >
                          Scroll to Bottom
                          <ArrowDownNarrowWide className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>"""
content = re.sub(button_pattern, button_replacement, content)

with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/app/predictor/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
