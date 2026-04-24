import re
import glob

files = glob.glob('src/**/*.jsx', recursive=True) + glob.glob('src/**/*.js', recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'invokeFunction' not in content:
        continue

    original = content

    # Fix: invokeFunction(..., { ... }\n    }); -> invokeFunction(..., { ... });
    content = re.sub(
        r'(await invokeFunction\([^;]+?)\s*\}\s*\n\s*\}\s*\);',
        r'\1});',
        content,
        flags=re.DOTALL
    )

    # Fix: invokeFunction(..., { ... }\n    }) -> invokeFunction(..., { ... })
    content = re.sub(
        r'(await invokeFunction\([^;]+?)\s*\}\s*\n\s*\}\s*\)',
        r'\1})',
        content,
        flags=re.DOTALL
    )

    # Remove orphan error handling after invokeFunction
    content = re.sub(r'\n\s*if \(error\) throw error;\n', '\n', content)
    content = re.sub(r'\n\s*if \(error\) \{[^}]+\}\n', '\n', content)
    content = re.sub(r'\n\s*if \(data\?\.error\) throw new Error\(data\.error\);\n', '\n', content)
    content = re.sub(r'\n\s*if \(data && data\.success === false\) \{[^}]+\}\n', '\n', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed: {filepath}')

print('Done.')
