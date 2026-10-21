import re

files = [
  'src/layouts/UserLayout.tsx',
  'src/pages/user/UserComplaints.tsx',
  'src/pages/user/UserDashboard.tsx',
  'src/pages/user/UserDustbinDetails.tsx',
  'src/pages/user/UserLiveMap.tsx',
  'src/pages/user/UserReportIssue.tsx',
  'src/services/complaintService.ts',
  'src/services/dustbinService.ts'
]

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Fix type imports
    content = re.sub(r"import\s+{\s*([^}]+)\s*}\s+from\s+'\.\./\.\./types'", r"import type { \1 } from '../../types'", content)
    content = re.sub(r"import\s+{\s*([^}]+)\s*}\s+from\s+'\.\./types'", r"import type { \1 } from '../types'", content)
    
    # Specific replacements
    content = content.replace("const { user, logout } = useAuth();", "const { logout } = useAuth();")
    content = content.replace("import { complaintService } from '../../services/complaintService';\n", "")
    content = content.replace(", Navigation } from 'lucide-react';", " } from 'lucide-react';")
    content = content.replace("(err) => {", "() => {")
    content = content.replace(", AlertCircle } from 'lucide-react';", " } from 'lucide-react';")
    content = content.replace(", useMap } from 'react-leaflet';", " } from 'react-leaflet';")
    
    with open(f, 'w') as file:
        file.write(content)

print("Fixed")
