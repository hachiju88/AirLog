#!/usr/bin/env python3
"""
表情シート画像を個別ファイルに切り出すスクリプト
"""

from PIL import Image
import os

# 入力画像
IMAGES = [
    '/Users/r-unit0000181/.gemini/antigravity/brain/c00b2597-44cc-48cf-9497-cbe30235405a/uploaded_media_0_1770380230320.jpg',
    '/Users/r-unit0000181/.gemini/antigravity/brain/c00b2597-44cc-48cf-9497-cbe30235405a/uploaded_media_1_1770380230320.jpg',
]

# 出力ディレクトリ
OUTPUT_DIR = '/Users/r-unit0000181/AirLog/public/girlfriend'

# グリッド設定
COLS = 3
ROWS = 4

def crop_expressions(image_path, prefix, output_dir):
    """画像を3x4のグリッドに切り分けて保存"""
    img = Image.open(image_path)
    width, height = img.size
    
    # セルサイズ計算（コピーライト部分を除外するため下部は少しカット）
    cell_width = width // COLS
    # 下部のコピーライトを除外（約5%カット）
    usable_height = int(height * 0.95)
    cell_height = usable_height // ROWS
    
    os.makedirs(output_dir, exist_ok=True)
    
    expressions = []
    index = 1
    
    for row in range(ROWS):
        for col in range(COLS):
            left = col * cell_width
            top = row * cell_height
            right = left + cell_width
            bottom = top + cell_height
            
            # 切り出し
            cell = img.crop((left, top, right, bottom))
            
            # ファイル名
            filename = f"{prefix}_{index:02d}.png"
            filepath = os.path.join(output_dir, filename)
            
            # PNG形式で保存（透過対応）
            cell.save(filepath, 'PNG')
            expressions.append(filename)
            print(f"Saved: {filename}")
            
            index += 1
    
    return expressions

def main():
    all_expressions = []
    
    for i, image_path in enumerate(IMAGES, 1):
        prefix = f"sheet{i}"
        expressions = crop_expressions(image_path, prefix, OUTPUT_DIR)
        all_expressions.extend(expressions)
    
    print(f"\n✅ Total expressions extracted: {len(all_expressions)}")
    print(f"📁 Output directory: {OUTPUT_DIR}")

if __name__ == '__main__':
    main()
