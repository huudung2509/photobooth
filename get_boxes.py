from PIL import Image
import json

def get_white_boxes(filename):
    img = Image.open(filename).convert("RGB")
    data = img.load()
    w, h = img.size
    
    visited = set()
    boxes = []
    
    for y in range(h):
        for x in range(w):
            if (x, y) in visited: continue
            r, g, b = data[x, y]
            
            # Check if pure white
            if r > 245 and g > 245 and b > 245:
                # Find bounds by scanning right and down
                mx, my = x, y
                while mx < w:
                    r2, g2, b2 = data[mx, y]
                    if r2 <= 245 or g2 <= 245 or b2 <= 245: break
                    mx += 1
                while my < h:
                    r2, g2, b2 = data[x, my]
                    if r2 <= 245 or g2 <= 245 or b2 <= 245: break
                    my += 1
                
                box_w = mx - x
                box_h = my - y
                
                if box_w > 50 and box_h > 50:
                    boxes.append({'x': x, 'y': y, 'w': box_w, 'h': box_h})
                    for yy in range(y, my):
                        for xx in range(x, mx):
                            visited.add((xx, yy))
                else:
                    mx_bound = min(x + min(box_w, 50), w)
                    for xx in range(x, mx_bound):
                        visited.add((xx, y))
            else:
                visited.add((x, y))
                
    return boxes

print(json.dumps(get_white_boxes('frame9.png'), indent=2))
