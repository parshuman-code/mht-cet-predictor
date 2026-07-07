import re

with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the specific block
pattern = r'<AnimatePresence mode="wait">\s*<ViewTransition viewKey="landing" className="w-full flex-1">\s*<div className="w-full flex-1 overflow-y-auto custom-scrollbar relative bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-50 min-h-\[calc\(100vh-73px\)\]">\s*<div className="fixed inset-0 pointer-events-none z-0">\s*<div className="w-full h-full bg-cover bg-center bg-no-repeat bg-fixed opacity-72 blur-\[2px\] scale-\[1\.02\]" style=\{\{ backgroundImage: "url\(\'/college\.jpg\'\)" \}\}\s*/>\s*<div className="absolute inset-0 bg-gradient-to-b from-white/25 via-blue-50/35 to-slate-50/80"\s*/>\s*<div className="absolute bottom-0 left-0 w-full h-\[50vh\] bg-gradient-to-t from-slate-50/70 to-transparent"\s*/>\s*</div>'

replacement = '''<div className="fixed inset-0 pointer-events-none z-0">
          <div className="w-full h-full bg-cover bg-center bg-no-repeat opacity-72 blur-[2px] scale-[1.02]" style={{ backgroundImage: "url('/college.jpg')" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-blue-50/35 to-slate-50/80" />
          <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-slate-50/70 to-transparent" />
        </div>
        <div className="w-full flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-transparent min-h-[calc(100vh-73px)]">'''

# I will also remove `bg-fixed` because it doesn't work well on mobile, and since it's already a fixed container, it's redundant.
content = re.sub(pattern, replacement, content)

# Remove the trailing tags
end_pattern = r'</div>\s*</ViewTransition>\s*</AnimatePresence>\s*</div>\s*</div>'
end_replacement = '</div>\n      </div>\n    </div>'
content = re.sub(end_pattern, end_replacement, content)

with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
