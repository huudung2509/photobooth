from PIL import Image
import sys

def find_boxes(file):
    img = Image.open(file).convert("RGBA")
    data = img.load()
    w, h = img.size
    visited = set()
    boxes = []

    for y in range(h):
        for x in range(w):
            if (x, y) in visited: continue
            
            r, g, b, a = data[x, y]
            if a < 128:  # Transparent pixel
                queue = [(x, y)]
                visited.add((x, y))
                min_x, max_x, min_y, max_y = x, x, y, y
                area = 0
                
                while queue:
                    cx, cy = queue.pop()
                    area += 1
                    min_x = min(min_x, cx)
                    max_x = max(max_x, cx)
                    min_y = min(min_y, cy)
                    max_y = max(max_y, cy)
                    
                    for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                        if 0 <= nx < w and 0 <= ny < h:
                            if (nx, ny) not in visited:
                                visited.add((nx, ny))
                                _, _, _, na = data[nx, ny]
                                if na < 128:
                                    queue.append((nx, ny))
                if area > 1000:
                    boxes.append((min_x, min_y, max_x - min_x + 1, max_y - min_y + 1))
            else:
                visited.add((x, y))
                
    boxes.sort(key=lambda b: b[1])
    print(f"--- {file} ---")
    for i, b in enumerate(boxes):
        print(f"Box {i+1}: {{x: {b[0]}, y: {b[1]}, w: {b[2]}, h: {b[3]}}}")

find_boxes("frame4.png")
find_boxes("frame5.png")
find_boxes("frame6.png")
