import re
import glob

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    if '8080' in content:
        content = content.replace('8080', '8081')
        with open(f, 'w') as file:
            file.write(content)

print("Ports fixed to 8081")
