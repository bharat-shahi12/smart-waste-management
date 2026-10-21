import re

# Fix UserLiveMap.tsx
with open('src/pages/user/UserLiveMap.tsx', 'r') as f:
    content = f.read()

# Make sure Navigation is correctly imported
if 'import { Filter, Navigation } from \'lucide-react\';' not in content:
    content = content.replace("import { Filter } from 'lucide-react';", "import { Filter, Navigation } from 'lucide-react';")

with open('src/pages/user/UserLiveMap.tsx', 'w') as f:
    f.write(content)

# Fix UserReportIssue.tsx
with open('src/pages/user/UserReportIssue.tsx', 'r') as f:
    content = f.read()

if 'complaintService' not in content.split('\n')[2]:
    content = content.replace("import { dustbinService } from '../../services/dustbinService';", "import { dustbinService } from '../../services/dustbinService';\nimport { complaintService } from '../../services/complaintService';")

with open('src/pages/user/UserReportIssue.tsx', 'w') as f:
    f.write(content)

print("Fixed")
