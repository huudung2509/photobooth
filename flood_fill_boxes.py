from PIL import Image
import json

def get_boxes(filename):
    # Try to load the original image if available, else the modified one
    try:
        img = Image.open(f"C:/Users/phamh/.gemini/antigravity-ide/brain/0d9aaae2-6d12-4917-91ae-64294d4c7692/media__1781890227145.png").convert("RGBA")
    except:
        img = Image.open(filename).convert("RGBA")
    data = img.load()
    w, h = img.size
    
    visited = set()
    boxes = []
    
    for y in range(h):
        for x in range(w):
            if (x, y) in visited: continue
            r, g, b, a = data[x, y]
            
            # frame9 boxes are pure white. Let's check for white
            is_white = r > 240 and g > 240 and b > 240
            
            if is_white:
                # flood fill
                q = [(x, y)]
                visited.add((x, y))
                min_x, max_x = x, x
                min_y, max_y = y, y
                area = 0
                
                head = 0
                while head < len(q):
                    cx, cy = q[head]
                    head += 1
                    area += 1
                    
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    
                    for dx, dy in [(1,0), (-1,0), (0,1), (0,-1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                            nr, ng, nb, na = data[nx, ny]
                            if nr > 240 and ng > 240 and nb > 240:
                                visited.add((nx, ny))
                                q.append((nx, ny))
                
                if area > 10000:
                    boxes.append({'x': min_x, 'y': min_y, 'w': max_x - min_x + 1, 'h': max_y - min_y + 1, 'area': area})
            else:
                visited.add((x, y))
                
    return boxes

print("frame9:", json.dumps(get_boxes('frame9.png'), indent=2))
