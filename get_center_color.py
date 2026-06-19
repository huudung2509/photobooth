from PIL import Image

img = Image.open('frame9.png').convert("RGBA")
data = img.load()
w, h = img.size

# Sample pixels down the middle
print(f"Center pixels of {w}x{h}:")
for y in range(0, h, 20):
    print(f"y={y}: {data[w//2, y]}")
