from PIL import Image

def find_white_rects(image_path):
    img = Image.open(image_path).convert('L')
    width, height = img.size
    pixels = img.load()
    
    is_white = [[0]*width for _ in range(height)]
    for y in range(height):
        for x in range(width):
            if pixels[x,y] > 240:
                is_white[y][x] = 1
                
    visited = [[0]*width for _ in range(height)]
    boxes = []
    
    for y in range(0, height, 5):
        for x in range(0, width, 5):
            if is_white[y][x] and not visited[y][x]:
                # BFS
                minX, maxX, minY, maxY = x, x, y, y
                q = [(x, y)]
                visited[y][x] = 1
                area = 0
                while q:
                    cx, cy = q.pop(0)
                    area += 1
                    if cx < minX: minX = cx
                    if cx > maxX: maxX = cx
                    if cy < minY: minY = cy
                    if cy > maxY: maxY = cy
                    
                    for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                        if 0 <= nx < width and 0 <= ny < height:
                            if is_white[ny][nx] and not visited[ny][nx]:
                                visited[ny][nx] = 1
                                q.append((nx, ny))
                
                w = maxX - minX
                h = maxY - minY
                # A photo slot is usually a large rectangle
                if w > 50 and h > 50 and area > w * h * 0.5: # mostly solid
                    boxes.append({'x': minX, 'y': minY, 'w': w, 'h': h, 'area': area})

    # Filter out nested boxes or huge background boxes
    valid_boxes = []
    for b in boxes:
        if b['w'] > width * 0.9 or b['h'] > height * 0.9:
            continue # probably the background or page
        # check if it's roughly proportional to a photo (e.g., 4:3 or 3:4)
        valid_boxes.append(b)

    for b in sorted(valid_boxes, key=lambda x: (x['x']//100, x['y'])):
        print(f"{{'x': {b['x']}, 'y': {b['y']}, 'w': {b['w']}, 'h': {b['h']}}}")

find_white_rects('frame3.jpg')
