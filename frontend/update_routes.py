import re

# Update page.tsx
with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'  const handleStartPredicting = \(\) => \{\n    if \(\!isSignedIn\) \{\n      setPendingPredictorAccess\(true\);\n      openSignIn\(\);\n      return;\n    \}\n    openPredictor\(\);\n  \};'
replacement = '''  const handleStartPredicting = () => {
    if (!isSignedIn) {
      try { sessionStorage.setItem("clgPredictPendingRoute", "predictor"); } catch {}
      openSignIn();
      return;
    }
    router.push("/predictor");
  };'''
content = re.sub(pattern, replacement, content)

with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Update SiteNavbar.tsx
with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/components/SiteNavbar.tsx', 'r', encoding='utf-8') as f:
    nav_content = f.read()

nav_content = nav_content.replace('router.push("/?view=predictor");', 'router.push("/predictor");')

with open('C:/Users/Prashant/OneDrive/Desktop/mht-cet-predictor/frontend/src/components/SiteNavbar.tsx', 'w', encoding='utf-8') as f:
    f.write(nav_content)
