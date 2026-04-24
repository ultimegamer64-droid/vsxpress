import re
import glob

files = glob.glob('src/**/*.jsx', recursive=True) + glob.glob('src/**/*.js', recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    original = lines[:]
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Skip orphan });  after invokeFunction
        if re.match(r'^\s*\}\s*\);\s*$', line) and i > 0:
            prev = new_lines[-1] if new_lines else ''
            if 'invokeFunction' in prev and not prev.rstrip().endswith(');'):
                # Fix the previous line by adding ); 
                new_lines[-1] = new_lines[-1].rstrip().rstrip(',').rstrip('}') + ');\n'
                i += 1
                continue
        
        # Skip orphan error handling lines
        if re.match(r'^\s*if \(error\)', line):
            i += 1
            # Skip multi-line error blocks
            if '{' in line and '}' not in line:
                while i < len(lines) and '}' not in lines[i]:
                    i += 1
                i += 1
            continue
        
        if re.match(r'^\s*if \(data\?\.error\)', line):
            i += 1
            continue
            
        if re.match(r'^\s*if \(funcError\)', line):
            i += 1
            continue

        if re.match(r'^\s*if \(data && data\.success', line):
            i += 1
            if '{' in line and '}' not in line:
                while i < len(lines) and '}' not in lines[i]:
                    i += 1
                i += 1
            continue

        new_lines.append(line)
        i += 1
    
    if new_lines != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f'Fixed: {filepath}')

print('Done.')
