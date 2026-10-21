const fs = require('fs');
const glob = require('glob'); // Note: we can just use normal node fs routines since there are only a few files

const filesToFix = [
  'src/layouts/UserLayout.tsx',
  'src/pages/user/UserComplaints.tsx',
  'src/pages/user/UserDashboard.tsx',
  'src/pages/user/UserDustbinDetails.tsx',
  'src/pages/user/UserLiveMap.tsx',
  'src/pages/user/UserReportIssue.tsx',
  'src/services/complaintService.ts',
  'src/services/dustbinService.ts'
];

filesToFix.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix type imports
  content = content.replace(/import\s+{\s*([^}]+)\s*}\s+from\s+'\.\.\/\.\.\/types'/g, "import type { $1 } from '../../types'");
  content = content.replace(/import\s+{\s*([^}]+)\s*}\s+from\s+'\.\.\/types'/g, "import type { $1 } from '../types'");
  
  // Fix unused vars in layouts/UserLayout.tsx
  content = content.replace(/const { user, logout } = useAuth\(\);/, "const { logout } = useAuth();");
  
  // Fix unused vars in pages/user/UserComplaints.tsx
  content = content.replace(/import { complaintService } from '\.\.\/\.\.\/services\/complaintService';\n/, "");
  
  // Fix unused vars in pages/user/UserDashboard.tsx
  content = content.replace(/, Navigation } from 'lucide-react';/, " } from 'lucide-react';");
  content = content.replace(/\(err\) => {/, "() => {");
  
  // Fix unused vars in pages/user/UserDustbinDetails.tsx
  content = content.replace(/, AlertCircle } from 'lucide-react';/, " } from 'lucide-react';");
  
  // Fix unused vars in pages/user/UserLiveMap.tsx
  content = content.replace(/, useMap } from 'react-leaflet';/, " } from 'react-leaflet';");
  
  fs.writeFileSync(file, content);
});

console.log("Typescript errors fixed.");
