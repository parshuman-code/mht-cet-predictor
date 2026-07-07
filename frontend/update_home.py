import re

with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the predictor block completely
pattern = r'\{/\* DASHBOARD PREDICTOR CORE WITH HOVER EXPANDABLE SIDEBAR \*/\}[\s\S]*</ViewTransition>\s*\)\}'
replacement = ''
content = re.sub(pattern, replacement, content)

# Remove the showPredictor wrapper around the landing page
wrapper_pattern_start = r'\{!showPredictor && \(\s*<ViewTransition viewKey="landing" className="w-full flex-1">'
wrapper_replacement_start = '<ViewTransition viewKey="landing" className="w-full flex-1">'
content = re.sub(wrapper_pattern_start, wrapper_replacement_start, content)

# Since we stripped the bottom predictor block, the remaining `)}` from `{!showPredictor && (` needs to be removed.
# Let's find the end of the ViewTransition for the landing page
end_wrapper_pattern = r'</ViewTransition>\s*\)\}\s*</AnimatePresence>'
end_wrapper_replacement = '</ViewTransition>\n        </AnimatePresence>'
content = re.sub(end_wrapper_pattern, end_wrapper_replacement, content)

# We can also clean up unnecessary predictor states, but let's just do a quick string replacement for the `useEffect` dependencies
# Change `useEffect(() => { ... }, [showPredictor]);` to `useEffect(() => { ... }, []);`
content = content.replace('}, [showPredictor]);', '}, []);')

with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
