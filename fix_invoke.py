import re
import os
import glob

files = glob.glob('src/**/*.jsx', recursive=True) + glob.glob('src/**/*.js', recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'supabase.functions.invoke' not in content:
        continue

    original = content

    content = re.sub(
        r'const \{ data(?::\s*\w+)?, error(?::\s*\w+)? \} = await supabase\.functions\.invoke\(',
        'const data = await invokeFunction(',
        content
    )
    
    content = re.sub(
        r'const \{ error(?::\s*\w+)? \} = await supabase\.functions\.invoke\(',
        'await invokeFunction(',
        content
    )
    
    content = re.sub(
        r'await supabase\.functions\.invoke\(',
        'await invokeFunction(',
        content
    )
    
    content = re.sub(
        r'(await invokeFunction\([\'"][^\'"]+[\'"],\s*\{)\s*body:\s*(\{)',
        r'\1\2',
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {filepath}')

print('Done.')
