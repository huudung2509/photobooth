from PIL import Image

img = Image.open('frame2.jpg').convert('L')
pixels = img.load()
width, height = img.size

colors = {}
for y in range(height):
    for x in range(width):
        colors[pixels[x,y]] = colors.get(pixels[x,y], 0) + 1

bg_color = max(colors, key=colors.get)

isHole = [[0]*width for _ in range(height)]
for y in range(height):
    for x in range(width):
        if abs(pixels[x,y] - bg_color) > 30: 
            isHole[y][x] = 1

boxes = []
visited = [[0]*width for _ in range(height)]

for y in range(0, height, 5):
    for x in range(0, width, 5):
        if isHole[y][x] and not visited[y][x]:
            minX, maxX, minY, maxY = x, x, y, y
            stack = [(x, y)]
            visited[y][x] = 1
            while stack:
                cx, cy = stack.pop()
                if cx < minX: minX = cx
                if cx > maxX: maxX = cx
                if cy < minY: minY = cy
                if cy > maxY: maxY = cy
                for nx, ny in [(cx+2, cy), (cx-2, cy), (cx, cy+2), (cx, cy-2)]:
                    if 0 <= nx < width and 0 <= ny < height:
                        if isHole[ny][nx] and not visited[ny][nx]:
                            visited[ny][nx] = 1
                            stack.append((nx, ny))
            
            w_box = maxX - minX
            h_box = maxY - minY
            if w_box > width * 0.15 and h_box > height * 0.15:
                boxes.append({'x': minX, 'y': minY, 'w': w_box, 'h': h_box})

for b in sorted(boxes, key=lambda x: (x['y']//100, x['x'])):
    print(b)
