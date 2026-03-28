import pypdf
import os
from PIL import Image

input_dir = r"C:\Users\000\.openclaw\workspace\Student list"
output_base = r"C:\Users\000\.openclaw\workspace\homecoming-2026\temp_ocr"

files = [f for f in os.listdir(input_dir) if f.endswith('.pdf')]

for filename in files:
    pdf_path = os.path.join(input_dir, filename)
    safe_name = filename.replace('.pdf', '').replace(' ', '_')
    output_dir = os.path.join(output_base, safe_name)
    os.makedirs(output_dir, exist_ok=True)
    
    reader = pypdf.PdfReader(pdf_path)
    print(f"\n[{filename}]: {len(reader.pages)} pages")
    
    for page_num, page in enumerate(reader.pages):
        if '/XObject' in page['/Resources']:
            xobjects = page['/Resources']['/XObject'].get_object()
            img_num = 0
            for key in xobjects:
                obj = xobjects[key].get_object()
                if obj.get('/Subtype') == '/Image':
                    try:
                        width = int(obj['/Width'])
                        height = int(obj['/Height'])
                        data = obj.get_data()
                        
                        safe_key = str(key).replace('/', '_').replace('<', '_').replace('>', '_')
                        out_path = os.path.join(output_dir, f'page{page_num+1}_{safe_key}.jpg')
                        
                        with open(out_path, 'wb') as f:
                            f.write(data)
                        print(f"  Page {page_num+1}: {width}x{height} -> {out_path}")
                        img_num += 1
                    except Exception as e:
                        print(f"  Error extracting {key}: {e}")
        else:
            print(f"  Page {page_num+1}: No XObjects")

print("\nDone extracting images")
