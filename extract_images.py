import pypdf
import os
from PIL import Image

pdf_path = r"C:\Users\000\.openclaw\workspace\Student list\Copy of 2001入学_先修联一&二名单.pdf"
output_dir = r"C:\Users\000\.openclaw\workspace\homecoming-2026\temp_ocr\images"
os.makedirs(output_dir, exist_ok=True)

reader = pypdf.PdfReader(pdf_path)
print(f"Pages: {len(reader.pages)}")

page = reader.pages[0]
xobjects = page['/Resources']['/XObject'].get_object()

for key in xobjects:
    obj = xobjects[key].get_object()
    if obj.get('/Subtype') == '/Image':
        width = int(obj['/Width'])
        height = int(obj['/Height'])
        colorspace = str(obj.get('/ColorSpace', '/DeviceRGB'))
        filter_type = str(obj.get('/Filter', 'None'))
        
        print(f"\nImage: {key}, Size: {width}x{height}, Filter: {filter_type}")
        
        try:
            data = obj.get_data()
            
            if '/DCTDecode' in filter_type:
                # JPEG encoded
                safe_name = str(key).replace('/', '_').replace('<', '_').replace('>', '_')
                out_path = os.path.join(output_dir, f'{safe_name}.jpg')
                with open(out_path, 'wb') as f:
                    f.write(data)
                print(f"  Saved JPEG to {out_path}")
            else:
                mode = 'RGB'
                if '/DeviceGray' in colorspace:
                    mode = 'L'
                safe_name = str(key).replace('/', '_').replace('<', '_').replace('>', '_')
                img = Image.frombytes(mode, (width, height), data)
                out_path = os.path.join(output_dir, f'{safe_name}.png')
                img.save(out_path)
                print(f"  Saved PNG to {out_path}")
                
        except Exception as e:
            print(f"  Error: {e}")
            import traceback
            traceback.print_exc()
