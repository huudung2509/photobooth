from PIL import Image
import sys
import json

def process_frame(file_path):
    img = Image.open(file_path).convert("RGBA")
    w, h = img.size
    data = img.load()
    
    # We want to find rectangles of solid color (almost black or almost white)
    visited = set()
    boxes = []
    
    for y in range(h):
        for x in range(w):
            if (x, y) in visited: continue
            r, g, b, a = data[x, y]
            
            # Check if color is close to white or black, and a is high
            is_white = r > 240 and g > 240 and b > 240
            is_black = r < 15 and g < 15 and b < 15
            
            if (is_white or is_black) and a > 200:
                # Find bounds
                mx, my = x, y
                while mx < w:
                    r2, g2, b2, a2 = data[mx, y]
                    w_cond = r2 > 240 and g2 > 240 and b2 > 240
                    b_cond = r2 < 15 and g2 < 15 and b2 < 15
                    if not ((is_white and w_cond) or (is_black and b_cond)):
                        break
                    mx += 1
                while my < h:
                    r2, g2, b2, a2 = data[x, my]
                    w_cond = r2 > 240 and g2 > 240 and b2 > 240
                    b_cond = r2 < 15 and g2 < 15 and b2 < 15
                    if not ((is_white and w_cond) or (is_black and b_cond)):
                        break
                    my += 1
                
                box_w = mx - x
                box_h = my - y
                
                # Check if it's a reasonable box (at least 50x50)
                if box_w > 50 and box_h > 50:
                    boxes.append({'x': x, 'y': y, 'w': box_w, 'h': box_h})
                    # Mark visited and make transparent
                    for yy in range(y, my):
                        for xx in range(x, mx):
                            visited.add((xx, yy))
                            data[xx, yy] = (0, 0, 0, 0) # Transparent
                else:
                    # Skip if too small
                    mx_bound = min(x + 50, w)
                    for xx in range(x, mx_bound):
                        visited.add((xx, y))
            else:
                visited.add((x, y))
                
    # Filter boxes that are inside other boxes (sometimes happens with borders)
    filtered = []
    for b1 in boxes:
        is_inside = False
        for b2 in boxes:
            if b1 == b2: continue
            if b1['x'] >= b2['x'] and b1['y'] >= b2['y'] and b1['x']+b1['w'] <= b2['x']+b2['w'] and b1['y']+b1['h'] <= b2['y']+b2['h']:
                is_inside = True
                break
        if not is_inside:
            filtered.append(b1)
            
    img.save(file_path)
    return filtered

res = {}
res['frame7.png'] = process_frame('frame7.png')
res['frame8.png'] = process_frame('frame8.png')
res['frame9.png'] = process_frame('frame9.png')
print(json.dumps(res, indent=2))
