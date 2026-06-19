from PIL import Image

def process(filename, target_color):
    img = Image.open(filename).convert("RGBA")
    data = img.load()
    w, h = img.size
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if target_color == 'white':
                if r > 240 and g > 240 and b > 240:
                    data[x, y] = (0, 0, 0, 0)
            elif target_color == 'black':
                if r < 15 and g < 15 and b < 15:
                    data[x, y] = (0, 0, 0, 0)
                    
    img.save(filename, "PNG")

# Re-copy originals
import shutil
shutil.copy("C:/Users/phamh/.gemini/antigravity-ide/brain/0d9aaae2-6d12-4917-91ae-64294d4c7692/media__1781890183416.png", "frame7.png")
shutil.copy("C:/Users/phamh/.gemini/antigravity-ide/brain/0d9aaae2-6d12-4917-91ae-64294d4c7692/media__1781890199775.png", "frame8.png")
shutil.copy("C:/Users/phamh/.gemini/antigravity-ide/brain/0d9aaae2-6d12-4917-91ae-64294d4c7692/media__1781890227145.png", "frame9.png")

process('frame7.png', 'white')
process('frame8.png', 'black')
process('frame9.png', 'white')
print("Transparency applied to frame7, 8, 9")
